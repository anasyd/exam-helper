import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
// Safety boundary: this integration command can only use its disposable local database.
const uri = process.env.PRACTICE_TEST_MONGODB_URI;
if (!uri || !/^mongodb:\/\/127\.0\.0\.1:27029\/practice_test_[a-z0-9_]+$/.test(uri)) throw new Error('Use only a disposable mongodb://127.0.0.1:27029/practice_test_<name> database');
// Empty strings prevent dotenv from loading operator credentials from a local .env.
for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'LS_API_KEY', 'LS_WEBHOOK_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']) process.env[name] = '';
process.env.REGISTRATION_MODE = 'open';
process.env.MONGODB_URI = uri;
process.env.BETTER_AUTH_SECRET = 'synthetic-test-secret-at-least-thirty-two-characters';
process.env.BETTER_AUTH_URL = 'http://localhost:4000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'production';
process.env.ADAPTIVE_PRACTICE_ENABLED = 'true';
const { connectDb, disconnectDb, db, contentCol } = await import('../src/db.js');
const { practiceStore, sessions } = await import('../src/practice/mongo.js');
const { PracticeService } = await import('../src/practice/service.js');
test('Mongo ownership, unique session creation, revision claims, answer recovery and resumption', async () => {
  await connectDb();
  try {
    await db().collection('projects').insertOne({ id: 'biology', userId: 'owner', flashcards: [{ sourceTopicTitle: 'Photosynthesis', timesCorrect: 1, timesIncorrect: 4, difficulty: 5 }] });
    await contentCol().insertOne({ projectId: 'biology', userId: 'owner', pdfContent: 'Chlorophyll absorbs light. Photosynthesis stores chemical energy in glucose.' });
    await assert.rejects(practiceStore.material('intruder', 'biology'), /PROJECT_NOT_FOUND/);
    const material = await practiceStore.material('owner', 'biology');
    assert.equal(material.reviews[0]?.incorrect, 4);
    let calls = 0;
    const service = new PracticeService(practiceStore, async ({ mode }) => {
      calls++;
      if (mode === 'assess') throw new Error('Synthetic provider failure');
      return { question: { id: randomUUID(), topic: 'Photosynthesis', question: 'What does chlorophyll absorb?', citations: [{ passageId: material.passages[0]!.id, quote: 'Chlorophyll absorbs light.' }] } };
    });
    const id = randomUUID();
    await Promise.all([1, 2].map(() => service.start('owner', 'biology', id, '')));
    assert.equal(await sessions().countDocuments({ id }), 1);
    const started = await service.get('owner', 'biology', id);
    const concurrent = await Promise.allSettled([1, 2].map(() => service.run('owner', 'biology', id, started.revision, { apiKey: 'synthetic-key', modelId: 'scripted' })));
    assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1); assert.equal(calls, 1);
    const asked = await service.get('owner', 'biology', id);
    await assert.rejects(service.run('owner', 'biology', id, asked.revision, { apiKey: 'synthetic-key', modelId: 'scripted' }, { questionId: asked.current!.id, answer: 'light' }), /PROVIDER_FAILURE/);
    const restarted = new PracticeService(practiceStore, async () => ({ assessment: { verdict: 'correct', explanation: 'The passage says chlorophyll absorbs light.', citations: asked.current!.citations, next: 'move_on' } }));
    const resumed = await restarted.get('owner', 'biology', id);
    assert.equal(resumed.pendingAnswer?.answer, 'light');
    const graded = await restarted.run('owner', 'biology', id, resumed.revision, { apiKey: 'synthetic-key', modelId: 'scripted' }, resumed.pendingAnswer);
    assert.equal(graded.results.length, 1);
    const retried = await restarted.run('owner', 'biology', id, resumed.revision, { apiKey: 'synthetic-key', modelId: 'scripted' }, resumed.pendingAnswer);
    assert.equal(retried.results.length, 1);
    assert.equal(await practiceStore.get('intruder', 'biology', id), null);
    assert.equal(await practiceStore.get('owner', 'other-project', id), null);
    assert.doesNotMatch(JSON.stringify(await sessions().findOne({ id })), /synthetic-key|apiKey/);
    assert.equal((await practiceStore.material('owner', 'biology')).reviews[0]?.incorrect, 4);
    // Exercise the real Better Auth middleware and HTTP routers without a paid model call.
    const { default: express } = await import('express');
    const { toNodeHandler } = await import('better-auth/node');
    const { auth } = await import('../src/auth.js');
    const { practiceRouter } = await import('../src/routes/practice.js');
    const { projectsRouter } = await import('../src/routes/projects.js');
    const { config } = await import('../src/config.js');
    const app = express();
    app.all('/api/auth/*', toNodeHandler(auth));
    app.use(express.json());
    app.use('/api/projects', projectsRouter);
    app.use('/api/practice', practiceRouter);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    async function request(path: string, cookie = '', body?: unknown, method?: string) {
      return fetch(base + path, { method: method ?? (body === undefined ? 'GET' : 'POST'),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookie },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    }
    async function signup(name: string) {
      const response = await request('/api/auth/sign-up/email', '', { email: `${name}-${randomUUID()}@example.test`, password: 'Synthetic-test-password-123', name });
      assert.equal(response.status, 200);
      return response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    }
    try {
      assert.equal((await request('/api/practice/capabilities')).status, 200);
      assert.equal((await request('/api/practice/http-biology')).status, 401);
      const ownerCookie = await signup('practice-owner');
      const otherCookie = await signup('practice-other');
      assert.ok(ownerCookie);
      const project = { name: 'HTTP biology', pdfContent: 'Chlorophyll absorbs light. Photosynthesis stores chemical energy in glucose.', flashcards: [] };
      assert.equal((await request('/api/projects/http-biology', ownerCookie, project, 'PUT')).status, 200);
      assert.equal((await request('/api/practice/http-biology', ownerCookie)).status, 200);
      assert.equal((await request('/api/practice/http-biology', otherCookie)).status, 404);
      const httpId = randomUUID();
      assert.equal((await request('/api/practice/http-biology', ownerCookie, { id: httpId, topic: '' })).status, 200);
      assert.equal((await request(`/api/practice/http-biology/sessions/${httpId}`, otherCookie)).status, 404);
      assert.equal((await request(`/api/practice/http-biology/sessions/${httpId}/run`, ownerCookie, { providerId: 'openai', modelId: 'gpt', encryptedApiKey: 'not-a-key', revision: 0 })).status, 400);
      assert.equal((await request('/api/practice/http-biology/passages/fabricated', ownerCookie)).status, 404);
      const actualSources = await request('/api/projects/http-biology', ownerCookie);
      const ownedProject = await actualSources.json() as { userId: string };
      const actualPassage = (await practiceStore.material(ownedProject.userId, 'http-biology')).passages[0]!;
      assert.equal((await request(`/api/practice/http-biology/passages/${actualPassage.id}`, ownerCookie)).status, 200);
      assert.equal((await request(`/api/practice/http-biology/passages/${actualPassage.id}`, otherCookie)).status, 404);
      assert.equal((await request(`/api/practice/http-biology/sessions/${httpId}/end`, ownerCookie, {})).status, 200);
      assert.equal((await request('/api/projects/http-biology', ownerCookie, undefined, 'DELETE')).status, 200);
      assert.equal(await sessions().countDocuments({ projectId: 'http-biology' }), 0);
      config.ADAPTIVE_PRACTICE_ENABLED = false;
      assert.equal((await request('/api/practice/capabilities')).status, 404);
      config.ADAPTIVE_PRACTICE_ENABLED = true;
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    const indexes = await sessions().indexes();
    assert.ok(indexes.some(i => i.unique));
    assert.ok(indexes.some(i => i.expireAfterSeconds === 90 * 86400));
  } finally {
    // URI above is restricted to this dedicated throwaway database, never an application database.
    await db().dropDatabase();
    await disconnectDb();
  }
});
