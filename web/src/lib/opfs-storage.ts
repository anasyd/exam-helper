/**
 * Origin Private File System storage adapter for Zustand persist.
 *
 * OPFS gives each origin a private directory on the user's device that
 * survives cache clears and stores gigabytes — far more robust than
 * localStorage's 5 MB cap.
 *
 * On first use, any existing localStorage data is migrated automatically
 * then the localStorage entry is deleted.
 *
 * Falls back to localStorage silently if OPFS is unavailable (SSR,
 * very old browsers, or private-browsing modes that block it).
 */

const STORE_FILE = "exam-helper-store.json";
const LS_LEGACY_KEY = "flashcards-storage-v2";

let _root: FileSystemDirectoryHandle | null = null;

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  if (_root) return _root;
  _root = await navigator.storage.getDirectory();
  return _root;
}

export function isOPFSSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    typeof (navigator.storage as { getDirectory?: unknown }).getDirectory === "function"
  );
}

export const opfsStorage = {
  async getItem(name: string): Promise<string | null> {
    if (!isOPFSSupported()) return localStorage.getItem(name);
    try {
      const root = await getRoot();
      try {
        const fh = await root.getFileHandle(STORE_FILE);
        const text = await (await fh.getFile()).text();
        if (text) return text;
      } catch {
        // File doesn't exist yet — fall through to migration check
      }
      // One-time migration: copy localStorage → OPFS then clear localStorage
      const legacy = localStorage.getItem(LS_LEGACY_KEY);
      if (legacy) {
        await opfsStorage.setItem(name, legacy);
        localStorage.removeItem(LS_LEGACY_KEY);
        return legacy;
      }
      return null;
    } catch {
      // OPFS blocked (storage-access policy etc.) — fall back to localStorage
      return localStorage.getItem(name);
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    if (!isOPFSSupported()) { localStorage.setItem(name, value); return; }
    try {
      const root = await getRoot();
      const fh = await root.getFileHandle(STORE_FILE, { create: true });
      const writable = await fh.createWritable();
      await writable.write(value);
      await writable.close();
    } catch {
      localStorage.setItem(name, value);
    }
  },

  async removeItem(name: string): Promise<void> {
    if (!isOPFSSupported()) { localStorage.removeItem(name); return; }
    try {
      const root = await getRoot();
      await root.removeEntry(STORE_FILE);
    } catch {
      // File may not exist — ignore
    }
  },
};
