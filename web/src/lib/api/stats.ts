const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<T>;
}

export interface UserStats {
  currentStreak: number;
  lastStudiedDate: string | null;
}

export function fetchStats(): Promise<UserStats> {
  return apiFetch<UserStats>("/api/me/stats");
}

export function putStats(stats: UserStats): Promise<void> {
  return apiFetch("/api/me/stats", { method: "PUT", body: JSON.stringify(stats) });
}
