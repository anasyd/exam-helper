const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

export interface TierLimits {
  projects: number;
  pdfsPerProject: number;
  maxFileSizeMb: number;
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
    emailVerified: boolean;
    createdAt: string;
  };
  planTier: "free" | "student" | "pro" | "admin";
  planExpiresAt: number | null;
  planCancelledAt: string | null;
  usage: {
    projects: number;
    limits: TierLimits;
  };
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${BASE}/api/me`, { credentials: "include" });
  if (!res.ok) throw new Error(`/api/me failed: ${res.status}`);
  return res.json() as Promise<MeResponse>;
}
