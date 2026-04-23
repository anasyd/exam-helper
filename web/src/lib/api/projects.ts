import type { Project } from "../store";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type ProjectSummary = Omit<
  Project,
  "pdfContent" | "originalTranscript" | "formattedTranscript"
>;

export async function fetchProjects(): Promise<ProjectSummary[]> {
  return apiFetch<ProjectSummary[]>("/api/projects");
}

export async function fetchProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

export async function upsertProject(project: Project): Promise<void> {
  await apiFetch(`/api/projects/${project.id}`, {
    method: "PUT",
    body: JSON.stringify(project),
  });
}

export async function deleteProjectRemote(id: string): Promise<void> {
  await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}

export async function batchUpsertProjects(
  projects: Project[],
): Promise<{ upserted: number }> {
  return apiFetch<{ upserted: number }>("/api/projects/batch", {
    method: "POST",
    body: JSON.stringify(projects),
  });
}
