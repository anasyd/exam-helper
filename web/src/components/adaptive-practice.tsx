"use client";
import { useEffect, useState } from 'react';
import { useFlashcardStore, type Project } from '@/lib/store';
import { useSession } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { practiceFetch, practiceCredentials, type PracticeInfo, type PracticeSession, type Citation } from '@/lib/api/practice';

const messages: Record<string, string> = {
  INSUFFICIENT_EVIDENCE: 'There is not enough clear source evidence. Choose another topic or add clearer material.',
  INVALID_EVIDENCE: 'The tutor could not validate its source references. Your answer is saved for retry.',
  SOURCE_CHANGED_OR_MISSING: 'This source has changed or was removed. Start a new session with the current material.',
  TIMEOUT: 'The provider took too long. Your submitted answer is preserved; retry when ready.',
  PROVIDER_FAILURE: 'The provider could not complete this turn. Check your Gemini key and retry.',
  SESSION_CHANGED_RELOAD: 'The session changed in another request. It has been refreshed; try again.',
  RUN_IN_PROGRESS: 'A turn is still running. Refresh the session in a moment.',
  SESSION_LIMIT: 'This session reached its practice or request limit. End it and start a new session.',
  PROJECT_NOT_FOUND: 'This project is not available on the server yet. Wait for sync, then reopen practice.',
  SOURCE_NOT_FOUND: 'The cited source is no longer available. End this session and start again with current material.',
  INVALID_MODEL_OUTPUT: 'The tutor returned an unusable response. Retry this turn.',
  PROVIDER_ERROR: 'The provider could not complete this turn. Check your selected model and retry.',
  TOKEN_BUDGET: 'This turn reached its context budget. Try a more specific topic in a new session.',
  TOOL_BUDGET: 'This turn reached its tool limit. Try a more specific topic in a new session.',
  KEY_EXPIRED_RETRY: 'The server restarted. Retry to encrypt your key again.',
};
export function AdaptivePractice({ project }: { project: Project }) {
  const { data } = useSession();
  return <AdaptivePracticeContent key={`${data?.user.id}:${project.id}`} project={project} />;
}
function AdaptivePracticeContent({ project }: { project: Project }) {
  const { data: auth } = useSession();
  const providers = useFlashcardStore(s => s.providers);
  const selection = useFlashcardStore(s => s.modelRouting.default);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<PracticeInfo | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [topic, setTopic] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState<{ label: string; text: string } | null>(null);
  useEffect(() => { void practiceFetch('capabilities').then(() => setEnabled(true)).catch(() => {}); }, []);
  // Draft is kept locally only until submitted. Once submitted the server is authoritative.
  const draftKey = `practice-draft:${auth?.user.id}:${project.id}:${session?.current?.id ?? ''}`;
  function applySession(next: PracticeSession | null) {
    setSession(next);
    const key = `practice-draft:${auth?.user.id}:${project.id}:${next?.current?.id ?? ''}`;
    setAnswer(next?.current ? next.pendingAnswer?.answer ?? sessionStorage.getItem(key) ?? '' : '');
  }
  const supported = selection.providerId === 'gemini' && ['gemini-2.5-flash', 'gemini-2.5-pro'].includes(selection.modelId);
  const canRun = supported && !!providers.gemini.apiKey && !!auth && !project.local;
  async function refresh() {
    const data = await practiceFetch<PracticeInfo>(encodeURIComponent(project.id));
    setInfo(data); applySession(data.session); return data.session;
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); }
    catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(messages[code] ?? 'Practice could not complete this request. Refresh and retry; your saved session is preserved.');
      await refresh().catch(() => {});
    } finally { setBusy(false); }
  }
  async function run(current: PracticeSession, submit = false) {
    if (!canRun) return;
    const encryptedApiKey = await practiceCredentials(providers.gemini.apiKey!);
    const result = await practiceFetch<PracticeSession>(`${project.id}/sessions/${current.id}/run`, {
      providerId: selection.providerId, modelId: selection.modelId, encryptedApiKey, revision: current.revision,
      ...(submit && current.current ? { submission: { questionId: current.current.id, answer: current.pendingAnswer?.answer ?? answer.trim() } } : {}),
    });
    applySession(result);
    if (submit) sessionStorage.removeItem(draftKey);
  }
  const citations = (items: Citation[]) => <div className="flex flex-wrap gap-2">{items.map((c, i) =>
    <Button key={c.passageId} variant="link" size="sm" onClick={() => void action(async () => {
      setSource(await practiceFetch(`${project.id}/passages/${c.passageId}`));
    })}>Open source {i + 1}</Button>)}</div>;
  if (!enabled) return null;
  return <section className="mb-6 ph-no-capture ph-sensitive">
    <Button variant="outline" onClick={() => { setOpen(!open); if (!open && auth && !project.local) void action(async () => { await refresh(); }); }} aria-expanded={open}>Adaptive practice</Button>
    {open && <Card className="mt-3 max-w-3xl mx-auto">
      <CardHeader><CardTitle>Practise what needs attention</CardTitle><CardDescription>One question at a time, grounded in your uploaded material. Practice results are separate from flashcard reviews.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {!auth && <p>Sign in to save and resume practice.</p>}
        {project.local && <p>Adaptive practice requires a synced project.</p>}
        {!supported && <p>Adaptive practice currently supports Gemini 2.5 Flash and Pro. Select one in Settings to use it. Your other generation features remain available.</p>}
        {supported && !providers.gemini.apiKey && <p>Add your Gemini API key in Settings.</p>}
        <p className="text-sm text-muted-foreground">When you start a turn, your selected Gemini key is encrypted in your browser and decrypted by the backend for that request. It is never saved in practice history. Relevant source passages and your answer are sent to your selected model.</p>
        {!info && auth && !project.local && <Button variant="outline" disabled={busy} onClick={() => void action(async () => { await refresh(); })}>Load practice / retry</Button>}
        {info && !info.hasSources && <p>Add readable study material before starting practice.</p>}
        {info && !session && info.weakTopics.length === 0 && <p>No review history yet. Start a short diagnostic or choose a topic.</p>}
        {info && (!session || session.status === 'ended') && <div className="space-y-3">
          <Label htmlFor="practice-topic">Topic</Label>
          <input id="practice-topic" list="practice-topics" className="border rounded-md bg-background px-3 py-2 w-full" placeholder="Choose from my weak topics (or diagnostic)" value={topic} onChange={e => setTopic(e.target.value)} maxLength={120} />
          <datalist id="practice-topics">{info.topics.map(t => <option key={t} value={t} />)}</datalist>
          <Button disabled={busy || !canRun || !info.hasSources} onClick={() => void action(async () => {
            const id = crypto.randomUUID();
            // Persist session before model execution, so refresh cannot lose the current turn.
            const created = await practiceFetch<PracticeSession>(project.id, { id, topic });
            applySession(created); await run(created);
          })}>{topic ? 'Practise this topic' : info.weakTopics.length ? 'Choose from my weak topics' : 'Start short diagnostic'}</Button>
        </div>}
        {session && <>
          <p className="text-sm text-muted-foreground">{session.diagnostic ? 'Diagnostic' : session.topic} · {session.results.length} completed</p>
          {session.status === 'active' && session.current && <div className="space-y-3">
            <h3 className="font-semibold">{session.current.topic}</h3><p className="text-lg leading-relaxed">{session.current.question}</p>
            <Label htmlFor="practice-answer">Your answer</Label>
            <Textarea id="practice-answer" value={answer} maxLength={6000} disabled={busy || !!session.pendingAnswer} onChange={e => { setAnswer(e.target.value); sessionStorage.setItem(draftKey, e.target.value); }} rows={5} />
            {session.pendingAnswer && <p className="text-sm">Your answer is saved and waiting for assessment.</p>}
            <Button disabled={busy || !canRun || !answer.trim()} onClick={() => void action(() => run(session, true))}>{session.pendingAnswer ? 'Retry assessment' : 'Check answer'}</Button>
          </div>}
          {session.results.map(r => <article key={r.question.id} className="border-t pt-4 space-y-2">
            <p className="font-medium">{r.question.question}</p><p className="text-sm whitespace-pre-wrap">Your answer: {r.answer}</p>
            <p className="font-semibold">{r.assessment.verdict.replaceAll('_', ' ')}</p><p>{r.assessment.explanation}</p>{citations(r.assessment.citations)}
          </article>)}
          {session.status === 'active' && !session.current && <Button disabled={busy || !canRun || session.results.length >= 12} onClick={() => void action(() => run(session))}>{session.results.length ? 'Next question' : 'Generate question / retry'}</Button>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void action(async () => { await refresh(); })}>Refresh session</Button>
            {session.status === 'active' && <Button variant="outline" disabled={busy} onClick={() => void action(async () => {
              applySession(await practiceFetch(`${project.id}/sessions/${session.id}/end`, {}));
              sessionStorage.removeItem(draftKey);
            })}>End session</Button>}
          </div>
          {session.status === 'ended' && <div className="rounded-md border p-4 space-y-2"><h3 className="font-semibold">Session summary</h3>
            {[...new Set(session.results.map(r => r.question.topic))].map(t => <p key={t}>{t}: {session.results.filter(r => r.question.topic === t && r.assessment.verdict === 'correct').length} correct of {session.results.filter(r => r.question.topic === t && r.assessment.verdict !== 'insufficient_evidence').length} assessable answers.</p>)}
            <p>Suggested revision: {[...new Set(session.results.filter(r => ['partly_correct', 'incorrect'].includes(r.assessment.verdict)).map(r => r.question.topic))].join(', ') || 'Review the cited passages, then try another topic.'}</p>
            {session.pendingAnswer && <p>One submitted answer was left unassessed: {session.pendingAnswer.answer}</p>}
          </div>}
        </>}
        {busy && <p role="status">Working… You can return to this saved session.</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </CardContent>
    </Card>}
    <Dialog open={!!source} onOpenChange={o => !o && setSource(null)}><DialogContent className="max-w-2xl ph-no-capture ph-sensitive"><DialogHeader><DialogTitle>{source?.label}</DialogTitle></DialogHeader><p className="whitespace-pre-wrap max-h-[60vh] overflow-y-auto text-sm">{source?.text}</p></DialogContent></Dialog>
  </section>;
}
