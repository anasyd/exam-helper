"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/client";
import { useFlashcardStore, type Project } from "@/lib/store";
import {
  fetchProjects,
  upsertProject,
  deleteProjectRemote,
  batchUpsertProjects,
  type ProjectSummary,
} from "@/lib/api/projects";

const DEBOUNCE_MS = 2_000;

// Merges a server project summary into the local project, preserving local
// large-content fields (pdfContent, transcripts) if the server summary omits them.
function mergeIntoLocal(local: Project | undefined, server: ProjectSummary): Project {
  return {
    // Preserve local large-content fields not included in server summaries
    pdfContent: local?.pdfContent ?? null,
    originalTranscript: local?.originalTranscript,
    formattedTranscript: local?.formattedTranscript,
    // Server summary wins for everything else
    ...server,
    updatedAt: new Date(server.updatedAt),
    createdAt: new Date(server.createdAt),
  };
}

export function ServerSync() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // projectId → updatedAt timestamp, tracks what we've pushed to server
  const syncedAtRef = useRef<Map<string, number>>(new Map());
  const prevIdsRef = useRef<Set<string>>(new Set());

  // On first login: pull server state, merge, and push any local-only projects
  useEffect(() => {
    if (!userId || initializedRef.current) return;
    initializedRef.current = true;

    void (async () => {
      try {
        const serverSummaries = await fetchProjects();
        const serverById = new Map(serverSummaries.map((p) => [p.id, p]));
        const localProjects = useFlashcardStore.getState().projects;
        const localById = new Map(localProjects.map((p) => [p.id, p]));

        // Local projects not yet on server → bulk-push
        const toUpload = localProjects.filter((p) => !serverById.has(p.id));
        if (toUpload.length > 0) {
          await batchUpsertProjects(toUpload);
        }

        // Server projects newer than local (or absent locally) → update local
        const toMerge = serverSummaries.filter((sp) => {
          const local = localById.get(sp.id);
          return !local || new Date(sp.updatedAt) > new Date(local.updatedAt);
        });

        if (toMerge.length > 0) {
          useFlashcardStore.setState((state) => {
            const byId = new Map(state.projects.map((p) => [p.id, p]));
            for (const sp of toMerge) {
              byId.set(sp.id, mergeIntoLocal(byId.get(sp.id), sp));
            }
            return { projects: Array.from(byId.values()) };
          });
        }

        // Seed synced-state tracker from current store
        const current = useFlashcardStore.getState().projects;
        for (const p of current) {
          syncedAtRef.current.set(p.id, new Date(p.updatedAt).getTime());
        }
        prevIdsRef.current = new Set(current.map((p) => p.id));
      } catch (err) {
        console.error("[server-sync] initial merge failed:", err);
      }
    })();
  }, [userId]);

  // Subscribe to store changes and debounce-push dirty projects to server
  useEffect(() => {
    if (!userId) return;

    const unsub = useFlashcardStore.subscribe((state) => {
      const { projects } = state;

      const dirty: Project[] = [];
      for (const p of projects) {
        const prev = syncedAtRef.current.get(p.id);
        const curr = new Date(p.updatedAt).getTime();
        if (prev === undefined || curr > prev) {
          dirty.push(p);
        }
      }

      const currentIds = new Set(projects.map((p) => p.id));
      const deletedIds: string[] = [];
      for (const id of prevIdsRef.current) {
        if (!currentIds.has(id)) {
          deletedIds.push(id);
          syncedAtRef.current.delete(id);
        }
      }
      prevIdsRef.current = currentIds;

      if (dirty.length === 0 && deletedIds.length === 0) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void (async () => {
          try {
            await Promise.all([
              ...dirty.map(async (p) => {
                await upsertProject(p);
                syncedAtRef.current.set(p.id, new Date(p.updatedAt).getTime());
              }),
              ...deletedIds.map((id) =>
                deleteProjectRemote(id).catch((e) =>
                  console.warn("[server-sync] delete failed:", id, e),
                ),
              ),
            ]);
          } catch (err) {
            console.error("[server-sync] sync failed:", err);
          }
        })();
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId]);

  return null;
}
