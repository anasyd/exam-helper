const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

export interface UploadedFile {
  fileId: string;
  fileName: string;
}

export interface ProjectFile {
  fileId: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  contentType: string;
}

export class TierError extends Error {
  constructor(
    public readonly code: "FILE_TOO_LARGE" | "PDF_LIMIT",
    public readonly detail: { limitMb?: number; limit?: number }
  ) {
    super(code);
  }
}

export async function uploadFile(file: File, projectId?: string): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  if (projectId) form.append("projectId", projectId);

  const res = await fetch(`${BASE}/api/files/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (body.code === "FILE_TOO_LARGE") throw new TierError("FILE_TOO_LARGE", { limitMb: body.limitMb as number });
    if (body.code === "PDF_LIMIT") throw new TierError("PDF_LIMIT", { limit: body.limit as number });
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json() as Promise<UploadedFile>;
}

export async function listProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const res = await fetch(`${BASE}/api/projects/${projectId}/files`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  return res.json() as Promise<ProjectFile[]>;
}

export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  const res = await fetch(`${BASE}/api/files/${fileId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Delete failed");
}
