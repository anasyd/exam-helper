"use client";

import { useEffect, useState, useCallback } from "react";
import { FileTextIcon, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/client";
import { listProjectFiles, downloadFile, deleteFile, type ProjectFile } from "@/lib/api/files";
import { useFlashcardStore } from "@/lib/store";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  projectId: string;
  /** Called after a file is deleted so the parent can refresh state */
  onDelete?: (fileId: string) => void;
  /** Bump this to force a re-fetch (e.g., after a new upload) */
  refreshKey?: number;
}

export function ProjectFileList({ projectId, onDelete, refreshKey }: Props) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const list = await listProjectFiles(projectId);
      setFiles(list);
    } finally {
      setLoading(false);
    }
  }, [projectId, session?.user]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleDownload(file: ProjectFile) {
    setDownloadingId(file.fileId);
    try {
      await downloadFile(file.fileId, file.fileName);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(file: ProjectFile) {
    setDeletingId(file.fileId);
    try {
      await deleteFile(file.fileId);
      setFiles((prev) => prev.filter((f) => f.fileId !== file.fileId));
      // If this was the project's tracked documentFileId, clear it from the store
      const project = useFlashcardStore.getState().projects.find((p) => p.id === projectId);
      if (project?.documentFileId === file.fileId) {
        useFlashcardStore.getState().updateProject(projectId, {
          documentFileId: undefined,
          documentFileName: undefined,
        });
      }
      onDelete?.(file.fileId);
      toast.success(`Deleted ${file.fileName}`);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading files…
      </div>
    );
  }

  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-1">
      {files.map((file) => (
        <div
          key={file.fileId}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-medium">{file.fileName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            title="Download"
            disabled={downloadingId === file.fileId}
            onClick={() => void handleDownload(file)}
          >
            {downloadingId === file.fileId ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
            title="Delete"
            disabled={deletingId === file.fileId}
            onClick={() => void handleDelete(file)}
          >
            {deletingId === file.fileId ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
