const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

export interface UploadedFile {
  fileId: string;
  fileName: string;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/api/files/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<UploadedFile>;
}

export function getFileUrl(fileId: string): string {
  return `${BASE}/api/files/${fileId}`;
}
