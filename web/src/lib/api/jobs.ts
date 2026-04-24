import type { FlashcardData, StudyGuide } from "@/lib/ai/types";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

export interface JobFlags {
  generateStudyGuide: boolean;
  generateNotes: boolean;
  generateFlashcards: boolean;
  flashcardCount: number;
}

export interface JobResult {
  studyGuide?: StudyGuide;
  notes?: string;
  flashcards?: FlashcardData[];
}

export interface Job {
  id: string;
  userId: string;
  projectId: string;
  status: "pending" | "running" | "done" | "failed";
  providerId: string;
  modelId: string;
  flags: JobFlags;
  result?: JobResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ── RSA helpers ───────────────────────────────────────────────────────────────

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function encryptWithPublicKey(publicKeyPem: string, plaintext: string): Promise<string> {
  const pubKey = await crypto.subtle.importKey(
    "spki",
    pemToDer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    pubKey,
    new TextEncoder().encode(plaintext),
  );
  const bytes = new Uint8Array(encrypted);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

let _cachedPublicKey: string | null = null;

async function getPublicKey(): Promise<string> {
  if (_cachedPublicKey) return _cachedPublicKey;
  const res = await fetch(`${BASE}/api/jobs/pubkey`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch public key: HTTP ${res.status}`);
  const { publicKey } = await res.json() as { publicKey: string };
  _cachedPublicKey = publicKey;
  return publicKey;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function submitJob(params: {
  projectId: string;
  providerId: string;
  modelId: string;
  apiKey: string;
  pdfContent: string;
  flags: JobFlags;
}): Promise<string> {
  const publicKey = await getPublicKey();
  const encryptedApiKey = await encryptWithPublicKey(publicKey, params.apiKey);

  const res = await fetch(`${BASE}/api/jobs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: params.projectId,
      providerId: params.providerId,
      modelId: params.modelId,
      encryptedApiKey,
      pdfContent: params.pdfContent,
      flags: params.flags,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to submit job: ${text}`);
  }

  const { jobId } = await res.json() as { jobId: string };
  return jobId;
}

export async function pollJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/api/jobs/${jobId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Poll failed: HTTP ${res.status}`);
  return res.json() as Promise<Job>;
}

export async function getProjectJobs(projectId: string): Promise<Job[]> {
  const res = await fetch(`${BASE}/api/jobs/project/${projectId}`, { credentials: "include" });
  if (!res.ok) return [];
  return res.json() as Promise<Job[]>;
}
