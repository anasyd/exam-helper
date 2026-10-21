import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth-guard.js';
import { decryptApiKey } from '../crypto.js';
import { logger } from '../logger.js';
import { PracticeError, weakTopics } from '../practice/core.js';
import { runTutor } from '../practice/agent.js';
import { practiceStore, sessions } from '../practice/mongo.js';
import { PracticeService } from '../practice/service.js';

export const practiceRouter = Router();
practiceRouter.use((_req, res, next) => {
  if (!config.ADAPTIVE_PRACTICE_ENABLED) { res.status(404).json({ error: 'Adaptive practice is disabled' }); return; }
  next();
});
practiceRouter.get("/capabilities", (_req, res) => { res.json({ enabled: true }); });
practiceRouter.use(requireAuth);
practiceRouter.use(rateLimit({ windowMs: 60_000, limit: 30, keyGenerator: req => (req as AuthedRequest).userId,
  standardHeaders: true, legacyHeaders: false }));
const service = new PracticeService(practiceStore, runTutor, metric => logger.info(metric, 'adaptive practice'));
const identity = (req: import('express').Request) => ({ userId: (req as AuthedRequest).userId,
  projectId: z.string().min(1).max(128).parse(req.params.projectId) });
const credentials = z.object({ providerId: z.literal('gemini'), modelId: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']), encryptedApiKey: z.string().min(16).max(4096) });
const sessionId = z.string().uuid();
// Express 4 needs explicit promise error handling. Never pass provider payloads to generic error logging.
function route(fn: (req: import('express').Request, res: import('express').Response) => Promise<void>) {
  return (req: import('express').Request, res: import('express').Response) => { void fn(req, res).catch(error => {
    const code = error instanceof PracticeError ? error.code : error instanceof z.ZodError ? 'INVALID_REQUEST' : 'PRACTICE_FAILURE';
    const status = error instanceof PracticeError ? error.status : error instanceof z.ZodError ? 400 : 503;
    res.status(status).json({ error: code });
  }); };
}
practiceRouter.get('/:projectId', route(async (req, res) => {
  const { userId, projectId } = identity(req);
  const material = await practiceStore.material(userId, projectId);
  const session = await sessions().findOne({ userId, projectId }, { sort: { createdAt: -1 }, projection: { _id: 0 } });
  res.json({ topics: material.topics, weakTopics: weakTopics(material), hasSources: material.passages.length > 0, session });
}));
practiceRouter.post('/:projectId', route(async (req, res) => {
  const { userId, projectId } = identity(req);
  const body = z.object({ id: sessionId, topic: z.string().max(120).default('') }).strict().parse(req.body);
  res.json(await service.start(userId, projectId, body.id, body.topic));
}));
practiceRouter.get('/:projectId/sessions/:id', route(async (req, res) => {
  const { userId, projectId } = identity(req);
  res.json(await service.get(userId, projectId, sessionId.parse(req.params.id)));
}));
const modelLimiter = rateLimit({ windowMs: 60_000, limit: 6, keyGenerator: req => (req as AuthedRequest).userId, standardHeaders: true, legacyHeaders: false });
practiceRouter.post('/:projectId/sessions/:id/run', modelLimiter, route(async (req, res) => {
  const { userId, projectId } = identity(req);
  const body = credentials.extend({ revision: z.number().int().nonnegative(),
    submission: z.object({ questionId: z.string().uuid(), answer: z.string().trim().min(1).max(6000) }).strict().optional() }).strict().parse(req.body);
  let apiKey: string;
  try { apiKey = decryptApiKey(body.encryptedApiKey); }
  catch { throw new PracticeError('KEY_EXPIRED_RETRY', 400); }
  if (!apiKey || apiKey.length > 256) throw new PracticeError('INVALID_KEY', 400);
  res.json(await service.run(userId, projectId, sessionId.parse(req.params.id), body.revision, { apiKey, modelId: body.modelId }, body.submission));
}));
practiceRouter.post('/:projectId/sessions/:id/end', route(async (req, res) => {
  const { userId, projectId } = identity(req);
  res.json(await service.end(userId, projectId, sessionId.parse(req.params.id)));
}));
practiceRouter.get('/:projectId/passages/:passageId', route(async (req, res) => {
  const { userId, projectId } = identity(req);
  const material = await practiceStore.material(userId, projectId);
  const passage = material.passages.find(p => p.id === req.params.passageId);
  if (!passage) throw new PracticeError('SOURCE_CHANGED_OR_MISSING', 404);
  res.json(passage);
}));
