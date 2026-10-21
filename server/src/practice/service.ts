import { randomUUID } from 'node:crypto';
import { checkAnswer, PracticeError, validateCitations, weakTopics, type Material, type PracticeSession } from './core.js';
import type { AgentRun, Metric } from './agent.js';
export interface PracticeStore {
  material(userId: string, projectId: string): Promise<Material>;
  get(userId: string, projectId: string, id: string): Promise<PracticeSession | null>;
  create(session: PracticeSession): Promise<void>;
  replace(previous: PracticeSession, next: PracticeSession): Promise<boolean>;
}
export class PracticeService {
  constructor(private store: PracticeStore, private agent: AgentRun, private log: (m: Metric) => void = () => {}, private timeoutMs = 45_000) {}
  async get(userId: string, projectId: string, id: string) {
    await this.store.material(userId, projectId);
    const session = await this.store.get(userId, projectId, id);
    if (!session) throw new PracticeError('SESSION_NOT_FOUND', 404);
    return session;
  }
  async start(userId: string, projectId: string, id: string, topic: string) {
    const material = await this.store.material(userId, projectId);
    const existing = await this.store.get(userId, projectId, id);
    if (existing) return existing;
    const weak = weakTopics(material);
    const session: PracticeSession = { id, userId, projectId, revision: 0, status: 'active',
      topic: topic || weak[0]?.topic || material.topics[0] || 'Diagnostic', diagnostic: !topic && weak.length === 0,
      results: [], attempts: 0, createdAt: new Date(), updatedAt: new Date() };
    await this.store.create(session);
    return this.get(userId, projectId, id);
  }
  private async commit(old: PracticeSession, next: PracticeSession) {
    next.revision = old.revision + 1;
    next.updatedAt = new Date();
    if (!await this.store.replace(old, next)) throw new PracticeError('SESSION_CHANGED_RELOAD', 409);
    return next;
  }
  async end(userId: string, projectId: string, id: string) {
    const session = await this.get(userId, projectId, id);
    // Ending fences any in-flight model run. Unassessed answers remain visible, never graded.
    const next = { ...session, status: 'ended' as const };
    delete next.lease;
    return this.commit(session, next);
  }
  async run(userId: string, projectId: string, id: string, expectedRevision: number,
    credentials: { apiKey: string; modelId: string }, submission?: { questionId: string; answer: string }) {
    let session = await this.get(userId, projectId, id);
    if (submission && checkAnswer(session, submission.questionId, submission.answer) === 'duplicate') return session;
    // A retried next-question request returns the already-created question.
    if (!submission && session.current) return session;
    if (session.status !== 'active') throw new PracticeError('SESSION_ENDED', 409);
    if (session.lease && session.lease.until > Date.now()) throw new PracticeError('RUN_IN_PROGRESS', 409);
    if (session.revision !== expectedRevision) throw new PracticeError('SESSION_CHANGED_RELOAD', 409);
    if (session.results.length >= 12 || session.attempts >= 36) throw new PracticeError('SESSION_LIMIT', 429);
    const runId = randomUUID();
    const claimed = { ...session, attempts: session.attempts + 1,
      lease: { runId, until: Date.now() + this.timeoutMs + 5000 },
      ...(submission ? { pendingAnswer: submission } : {}),
    };
    session = await this.commit(session, claimed);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();
    let status = 'failed';
    let failure: string | undefined;
    try {
      const mode = session.pendingAnswer ? 'assess' : 'question';
      // Race is necessary even if a provider fails to honour cancellation. The late run cannot commit.
      const output = await Promise.race([
        this.agent({ session, mode, ...credentials, signal: controller.signal,
          load: () => this.store.material(userId, projectId),
          log: metric => this.log({ sessionId: id, runId, ...metric }),
        }),
        new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new PracticeError('TIMEOUT', 504)), { once: true })),
      ]);
      if (controller.signal.aborted) throw new PracticeError('TIMEOUT', 504);
      // Ownership must still exist at commit time.
      const material = await this.store.material(userId, projectId);
      const citations = 'assessment' in output ? output.assessment.citations : output.question.citations;
      validateCitations(citations, new Map(material.passages.map(p => [p.id, p])));
      const next = { ...session };
      delete next.lease;
      if (mode === 'assess' && 'assessment' in output && next.current && next.pendingAnswer) {
        next.results = [...next.results, { question: next.current, answer: next.pendingAnswer.answer, assessment: output.assessment }];
        delete next.current;
        delete next.pendingAnswer;
        if (next.results.length >= (next.diagnostic ? 3 : 12)) next.status = 'ended';
      } else if (mode === 'question' && 'question' in output) {
        next.current = output.question;
      } else throw new PracticeError('INVALID_TRANSITION');
      const saved = await this.commit(session, next);
      status = 'completed';
      return saved;
    } catch (error) {
      failure = error instanceof PracticeError ? error.code : 'PROVIDER_FAILURE';
      const next = { ...session };
      delete next.lease;
      // Preserve submitted answer on failure; release only our own revision/lease.
      await this.store.replace(session, { ...next, revision: session.revision + 1, updatedAt: new Date() });
      throw error instanceof PracticeError ? error : new PracticeError('PROVIDER_FAILURE', 502);
    } finally {
      clearTimeout(timer);
      controller.abort();
      this.log({ sessionId: id, runId, status, failure, durationMs: Date.now() - started, retryCount: session.attempts - 1 });
    }
  }
}
