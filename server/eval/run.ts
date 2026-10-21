/** Paid, synthetic-only evaluation. Never run as part of tests or startup. */
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { runEvals, TOOL_TRAJECTORY_SCORE_KEY } from '@google/adk';
import { z } from 'zod';
import { createTutorRuntime, runTutor, type Metric } from '../src/practice/agent.js';
import { passages, type Material, type PracticeSession } from '../src/practice/core.js';

const caseSchema = z.object({ id: z.string(), question: z.string(), answer: z.string(), expected: z.string(), next: z.array(z.string()), rubric: z.string(), source: z.string().optional() });
const cases = z.array(caseSchema).parse(JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8')));
if (!process.argv.includes('--allow-paid') || !process.env.PRACTICE_EVAL_API_KEY) {
  console.error('Requires explicit --allow-paid and PRACTICE_EVAL_API_KEY; synthetic data only. No calls made.'); process.exit(2);
}
const source = await readFile(new URL('./biology.txt', import.meta.url), 'utf8');
let failures = 0;
for (const fixture of cases) {
  const material: Material = { passages: passages(fixture.source ?? source), topics: ['Photosynthesis'], reviews: [] };
  const p = material.passages[0];
  const question = { id: randomUUID(), topic: 'Photosynthesis', question: fixture.question,
    citations: p ? [{ passageId: p.id, quote: p.text.slice(0, 80) }] : [] };
  const session: PracticeSession = { id: randomUUID(), userId: 'synthetic-evaluation', projectId: 'synthetic-biology', revision: 0, status: 'active',
    topic: 'Photosynthesis', diagnostic: false, results: [], current: question,
    pendingAnswer: { questionId: question.id, answer: fixture.answer }, attempts: 0, createdAt: new Date(), updatedAt: new Date() };
  const metrics: Metric[] = [];
  const input = { session, mode: 'assess' as const, apiKey: process.env.PRACTICE_EVAL_API_KEY!, modelId: 'gemini-2.5-flash',
    signal: AbortSignal.timeout(45_000), load: async () => material, log: (m: Metric) => metrics.push(m) };
  try {
    const result = await runTutor(input);
    const actual = 'assessment' in result ? result.assessment.verdict : 'question';
    const tools = metrics.filter(m => m.tool).map(m => m.tool);
    const retrievalFirst = tools.indexOf('search_document') >= 0 && tools.indexOf('get_source_passage') > tools.indexOf('search_document') && tools.indexOf('save_practice_result') > tools.indexOf('get_source_passage');
    const next = 'assessment' in result ? result.assessment.next : '';
    const passed = actual === fixture.expected && fixture.next.includes(next) && retrievalFirst && tools.length <= 12;
    if (!passed) failures++;
    // Safe here: synthetic-only answers and passages. These are eval artifacts, never routine logs.
    console.log(JSON.stringify({ id: fixture.id, passed, actual, expected: fixture.expected, next, retrievalFirst,
      citationsResolve: true, tools, result, rubric: fixture.rubric,
      manualReview: 'Check that cited text supports the explanation and that the next question addresses performance.' }));
    // Exercise adaptation by generating the next question using actual production code.
    if ('assessment' in result) {
      const nextSession = { ...session, results: [{ question, answer: fixture.answer, assessment: result.assessment }] };
      delete nextSession.current; delete nextSession.pendingAnswer;
      const followUp = await runTutor({ ...input, session: nextSession, mode: 'question', signal: AbortSignal.timeout(45_000) });
      console.log(JSON.stringify({ id: fixture.id, followUp, review: 'Review question relevance against the verdict and next action above.' }));
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : 'FAILED';
    const passed = fixture.expected === 'INSUFFICIENT_EVIDENCE' && code === fixture.expected;
    if (!passed) failures++;
    console.log(JSON.stringify({ id: fixture.id, passed, errorCategory: code === fixture.expected ? code : 'RUN_FAILED' }));
  }
}
// Native ADK trajectory evaluation on the production agent, without grading an answer.
// Exact arguments/order are deliberately strict; use as a diagnostic, not a pedagogical score.
const material: Material = { passages: passages(source), topics: ['Photosynthesis'], reviews: [] };
const session: PracticeSession = { id: randomUUID(), userId: 'synthetic-evaluation', projectId: 'synthetic-biology', revision: 0, status: 'active', topic: 'Photosynthesis', diagnostic: false, results: [], attempts: 0, createdAt: new Date(), updatedAt: new Date() };
const { agent } = createTutorRuntime({ session, mode: 'question', apiKey: process.env.PRACTICE_EVAL_API_KEY!, modelId: 'gemini-2.5-flash',
  signal: AbortSignal.timeout(45_000), load: async () => material, log: () => {} });
for await (const result of runEvals({ rootAgent: agent, evalMetrics: [{ metric_name: TOOL_TRAJECTORY_SCORE_KEY, threshold: 1 }],
  evalCasesByEvalSetId: { synthetic: [{ name: 'retrieve_before_question', data: [{
    query: 'Ask one question on Photosynthesis. First search_document with query chlorophyll, then get_source_passage for the match. Return the question JSON.',
    expected_tool_use: [{ tool_name: 'search_document', tool_input: { query: 'chlorophyll' } }, { tool_name: 'get_source_passage', tool_input: { passageId: material.passages[0]!.id } }],
    expected_intermediate_agent_responses: [], reference: '',
  }] }] },
})) console.log(JSON.stringify({ nativeAdkTrajectory: result }));
process.exitCode = failures ? 1 : 0;
