import { encryptWithPublicKey } from './jobs';
const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? '';
export interface Citation { passageId: string; quote: string }
export interface PracticeQuestion { id: string; topic: string; question: string; citations: Citation[] }
export interface PracticeAssessment {
  verdict: 'correct' | 'partly_correct' | 'incorrect' | 'insufficient_evidence';
  explanation: string; citations: Citation[]; next: 'follow_up' | 'revisit' | 'move_on';
}
export interface PracticeSession {
  id: string; revision: number; status: 'active' | 'ended'; topic: string; diagnostic: boolean;
  current?: PracticeQuestion; results: { question: PracticeQuestion; answer: string; assessment: PracticeAssessment }[];
  pendingAnswer?: { questionId: string; answer: string }; lease?: { until: number };
}
export interface PracticeInfo { topics: string[]; weakTopics: { topic: string }[]; hasSources: boolean; session: PracticeSession | null }
export async function practiceFetch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/practice/${path}`, { credentials: 'include',
    ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || `HTTP ${res.status}`); }
  return res.json();
}
export async function practiceCredentials(apiKey: string) {
  // Fresh key every time: the server rotates its RSA key on restart.
  const res = await fetch(`${BASE}/api/jobs/pubkey`, { credentials: 'include' });
  if (!res.ok) throw new Error('KEY_UNAVAILABLE');
  const { publicKey } = await res.json();
  return encryptWithPublicKey(publicKey, apiKey);
}
export function passageUrl(projectId: string, passageId: string) {
  return `${BASE}/api/practice/${encodeURIComponent(projectId)}/passages/${encodeURIComponent(passageId)}`;
}
