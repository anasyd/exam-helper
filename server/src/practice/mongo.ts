import { z } from 'zod';
import { db, contentCol } from '../db.js';
import { passages, PracticeError, type Material, type PracticeSession, type Review } from './core.js';
import type { PracticeStore } from './service.js';
export const sessions = () => db().collection<PracticeSession>('practiceSessions');
export const practiceStore: PracticeStore = {
  async material(userId, projectId): Promise<Material> {
    const project = await db().collection('projects').findOne({ userId, id: projectId });
    if (!project) throw new PracticeError('PROJECT_NOT_FOUND', 404);
    const content = await contentCol().findOne({ userId, projectId });
    const source = content?.pdfContent || project.pdfContent || content?.originalTranscript || project.originalTranscript || '';
    const extracted = passages(typeof source === 'string' ? source : '');
    const cardSchema = z.object({
      sourceTopicTitle: z.string().max(120).optional(),
      timesCorrect: z.number().int().nonnegative().max(1_000_000),
      timesIncorrect: z.number().int().nonnegative().max(1_000_000),
      difficulty: z.number().min(1).max(5),
    });
    const reviews: Review[] = [];
    for (const raw of (Array.isArray(project.flashcards) ? project.flashcards : []).slice(0, 5000)) {
      const card = cardSchema.safeParse(raw);
      if (card.success) reviews.push({ topic: card.data.sourceTopicTitle || 'General revision', correct: card.data.timesCorrect,
        incorrect: card.data.timesIncorrect, difficulty: card.data.difficulty });
    }
    const grouped = new Map<string, Review>();
    for (const r of reviews) {
      const previous = grouped.get(r.topic);
      grouped.set(r.topic, previous ? { topic: r.topic, correct: previous.correct + r.correct, incorrect: previous.incorrect + r.incorrect, difficulty: Math.max(previous.difficulty, r.difficulty) } : r);
    }
    const guide = content?.studyGuide || project.studyGuide;
    const topics = new Set<string>(grouped.keys());
    if (Array.isArray(guide?.sections)) for (const section of guide.sections.slice(0, 40)) {
      if (Array.isArray(section.topics)) for (const topic of section.topics.slice(0, 40)) if (typeof topic.title === 'string') topics.add(topic.title.slice(0, 120));
    }
    return { passages: extracted, reviews: [...grouped.values()].slice(0, 100), topics: [...topics].slice(0, 40) };
  },
  async get(userId, projectId, id) { return sessions().findOne({ userId, projectId, id }, { projection: { _id: 0 } }); },
  async create(session) {
    try { await sessions().insertOne(session); }
    catch (error) { if (!(typeof error === 'object' && error && 'code' in error && error.code === 11000)) throw error; }
  },
  async replace(previous, next) {
    const result = await sessions().replaceOne({ userId: previous.userId, projectId: previous.projectId, id: previous.id, revision: previous.revision }, next);
    return result.modifiedCount === 1;
  },
};
