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
import { fetchStats, putStats } from "@/lib/api/stats";

const DEBOUNCE_MS = 2_000;
// Skip the server fetch if we synced within this window — local OPFS data is fresh enough
const SYNC_CACHE_MS = 3 * 60 * 1000; // 3 minutes

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
  const statsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // projectId → updatedAt timestamp, tracks what we've pushed to server
  const syncedAtRef = useRef<Map<string, number>>(new Map());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const prevStreakRef = useRef<{ currentStreak: number; lastStudiedDate: string | null } | null>(null);

  // On first login: pull server state, merge, and push any local-only projects
  useEffect(() => {
    if (!userId || initializedRef.current) return;
    initializedRef.current = true;

    void (async () => {
      const { lastServerSyncAt, setLastServerSyncAt } = useFlashcardStore.getState();
      const cacheHit = lastServerSyncAt !== null && Date.now() - lastServerSyncAt < SYNC_CACHE_MS;

      // Seed tracker from whatever is already in the store (OPFS data shown immediately)
      const seedProjects = useFlashcardStore.getState().projects;
      for (const p of seedProjects) {
        syncedAtRef.current.set(p.id, new Date(p.updatedAt).getTime());
      }
      prevIdsRef.current = new Set(seedProjects.map((p) => p.id));

      if (cacheHit) {
        // OPFS data is fresh — skip server round-trip, still track streak ref
        const s = useFlashcardStore.getState();
        prevStreakRef.current = { currentStreak: s.currentStreak, lastStudiedDate: s.lastStudiedDate };
        return;
      }

      try {
        const serverSummaries = await fetchProjects();
        const serverById = new Map(serverSummaries.map((p) => [p.id, p]));
        const localProjects = useFlashcardStore.getState().projects;
        const localById = new Map(localProjects.map((p) => [p.id, p]));

        // Local projects not yet on server → bulk-push (skip local-only projects)
        const toUpload = localProjects.filter((p) => !p.local && !serverById.has(p.id));
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

        // Re-seed tracker after merge
        const current = useFlashcardStore.getState().projects;
        for (const p of current) {
          syncedAtRef.current.set(p.id, new Date(p.updatedAt).getTime());
        }
        prevIdsRef.current = new Set(current.map((p) => p.id));

        setLastServerSyncAt(Date.now());

        // Sync streak
        try {
          const serverStats = await fetchStats();
          const localStreak = useFlashcardStore.getState().currentStreak;
          const localDate = useFlashcardStore.getState().lastStudiedDate;
          const serverDate = serverStats.lastStudiedDate;
          const serverIsNewer = serverDate && (!localDate || serverDate > localDate);
          if (serverIsNewer) {
            useFlashcardStore.setState({
              currentStreak: serverStats.currentStreak,
              lastStudiedDate: serverStats.lastStudiedDate,
            });
          } else if (localStreak > 0 || localDate) {
            await putStats({ currentStreak: localStreak, lastStudiedDate: localDate });
          }
          const s = useFlashcardStore.getState();
          prevStreakRef.current = { currentStreak: s.currentStreak, lastStudiedDate: s.lastStudiedDate };
        } catch (err) {
          console.error("[server-sync] streak sync failed:", err);
        }
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
        if (p.local) continue;
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

  // Debounce-push streak changes to server
  useEffect(() => {
    if (!userId) return;

    const unsub = useFlashcardStore.subscribe((state) => {
      const { currentStreak, lastStudiedDate } = state;
      const prev = prevStreakRef.current;
      if (prev && prev.currentStreak === currentStreak && prev.lastStudiedDate === lastStudiedDate) return;
      prevStreakRef.current = { currentStreak, lastStudiedDate };

      if (statsDebounceRef.current) clearTimeout(statsDebounceRef.current);
      statsDebounceRef.current = setTimeout(() => {
        void putStats({ currentStreak, lastStudiedDate }).catch((e) =>
          console.warn("[server-sync] streak push failed:", e),
        );
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (statsDebounceRef.current) clearTimeout(statsDebounceRef.current);
    };
  }, [userId]);

  return null;
}
