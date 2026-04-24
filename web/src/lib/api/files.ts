const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

export interface UploadedFile {
  fileId: string;
  fileName: string;
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

export function getFileUrl(fileId: string): string {
  return `${BASE}/api/files/${fileId}`;
}
