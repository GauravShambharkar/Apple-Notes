import { useEffect, useRef, useState } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import {
  clearStoredDirectoryHandle,
  getStoredDirectoryHandle,
  saveDirectoryHandle,
} from "@/lib/idbHandleStore";
import {
  type ExportDirectory,
  readNotesFromDirectory,
  writeNotesToDirectory,
} from "@/lib/fileExportUtils";

export function useAutoSave() {
  const { notes, syncFromDisk } = useNotesStore();
  const [autoSave, setAutoSave] = useState(false);
  const [autoSaveGranted, setAutoSaveGranted] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportDirectory = useRef<ExportDirectory | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const isInitializedRef = useRef(false);

  const toggleAutoSave = async () => {
    if (autoSave) {
      setAutoSave(false);
      localStorage.setItem("apple-notes-auto-save", "off");
      localStorage.removeItem("apple-notes-auto-save-granted");
      setAutoSaveGranted(false);
      exportDirectory.current = null;
      await clearStoredDirectoryHandle();
      return;
    }
    if (exporting) return;

    // Check if we already have a handle stored in IndexedDB
    const stored = await getStoredDirectoryHandle();
    if (stored) {
      try {
        const root = stored as unknown as ExportDirectory;
        if (
          root.requestPermission &&
          (await (
            root.requestPermission as (opts?: {
              mode: string;
            }) => Promise<string>
          )({ mode: "readwrite" })) === "granted"
        ) {
          exportDirectory.current = root;
          const { diskFolders, diskNotes } = await readNotesFromDirectory(root);
          if (diskNotes.length > 0 || diskFolders.length > 0) {
            syncFromDisk(diskFolders, diskNotes);
          }
          await writeNotesToDirectory(root, useNotesStore.getState().notes);
          setAutoSave(true);
          localStorage.setItem("apple-notes-auto-save", "on");
          setAutoSaveGranted(true);
          localStorage.setItem("apple-notes-auto-save-granted", "true");
          return;
        }
      } catch {
        // Fall through to showDirectoryPicker if handle permission fails
      }
    }

    const picker = (
      window as Window & {
        showDirectoryPicker?: () => Promise<ExportDirectory>;
      }
    ).showDirectoryPicker;

    if (!picker) {
      window.alert(
        "Choose a folder export is not supported in this browser. Please use Chrome or Edge.",
      );
      return;
    }

    setExporting(true);
    try {
      const root = await picker();
      exportDirectory.current = root;
      if (
        root.requestPermission &&
        (await (
          root.requestPermission as (opts?: { mode: string }) => Promise<string>
        )({ mode: "readwrite" })) !== "granted"
      ) {
        setAutoSave(false);
        localStorage.setItem("apple-notes-auto-save", "off");
        localStorage.removeItem("apple-notes-auto-save-granted");
        setAutoSaveGranted(false);
        return;
      }
      await saveDirectoryHandle(root as unknown as FileSystemDirectoryHandle);
      const { diskFolders, diskNotes } = await readNotesFromDirectory(root);
      if (diskNotes.length > 0 || diskFolders.length > 0) {
        syncFromDisk(diskFolders, diskNotes);
      }
      await writeNotesToDirectory(root, useNotesStore.getState().notes);
      setAutoSave(true);
      localStorage.setItem("apple-notes-auto-save", "on");
      setAutoSaveGranted(true);
      localStorage.setItem("apple-notes-auto-save-granted", "true");
    } catch {
      exportDirectory.current = null;
      setAutoSave(false);
      localStorage.removeItem("apple-notes-auto-save");
      localStorage.removeItem("apple-notes-auto-save-granted");
      setAutoSaveGranted(false);
    } finally {
      setExporting(false);
    }
  };

  // Restore stored directory handle from IndexedDB on page load / new tab
  useEffect(() => {
    const initAutoSave = async () => {
      try {
        const isAutoSaveOn =
          localStorage.getItem("apple-notes-auto-save") === "on";
        const isGranted =
          localStorage.getItem("apple-notes-auto-save-granted") === "true";

        if (isAutoSaveOn) setAutoSave(true);
        if (isGranted) setAutoSaveGranted(true);
        if (!isAutoSaveOn) return;

        const stored = await getStoredDirectoryHandle();
        if (stored) {
          exportDirectory.current = stored as unknown as ExportDirectory;
          try {
            const perm = await (
              stored as unknown as {
                queryPermission?: (opts: { mode: string }) => Promise<string>;
              }
            ).queryPermission?.({ mode: "readwrite" });
            if (perm === "granted") {
              setAutoSave(true);
              setAutoSaveGranted(true);
              const { diskFolders, diskNotes } =
                await readNotesFromDirectory(exportDirectory.current);
              if (diskNotes.length > 0 || diskFolders.length > 0) {
                syncFromDisk(diskFolders, diskNotes);
              }
            } else {
              setAutoSaveGranted(false);
            }
          } catch {
            setAutoSaveGranted(false);
          }
        }
      } finally {
        isInitializedRef.current = true;
      }
    };
    initAutoSave();
  }, [syncFromDisk]);

  // Continuous auto-save to directory whenever notes state changes
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (!autoSave || !exportDirectory.current) return;
    const dir = exportDirectory.current;

    saveQueue.current = saveQueue.current
      .then(async () => {
        try {
          const perm = await (
            dir as unknown as {
              queryPermission?: (opts: { mode: string }) => Promise<string>;
            }
          ).queryPermission?.({ mode: "readwrite" });
          if (perm === "granted") {
            await writeNotesToDirectory(dir, notes);
          }
        } catch {}
      })
      .catch(() => {});
  }, [notes, autoSave]);

  // Auto-sync from directory when window regains focus or periodically when autoSave is active
  useEffect(() => {
    if (!autoSave) return;

    const performSync = async () => {
      if (!exportDirectory.current) return;
      try {
        const perm = await (
          exportDirectory.current as unknown as {
            queryPermission?: (opts: { mode: string }) => Promise<string>;
          }
        ).queryPermission?.({ mode: "readwrite" });
        if (perm === "granted") {
          const { diskFolders, diskNotes } = await readNotesFromDirectory(
            exportDirectory.current,
          );
          if (diskNotes.length > 0 || diskFolders.length > 0) {
            syncFromDisk(diskFolders, diskNotes);
          }
        }
      } catch {}
    };

    const handleFocus = () => {
      performSync();
    };

    window.addEventListener("focus", handleFocus);
    const interval = setInterval(performSync, 4000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [autoSave, syncFromDisk]);

  // Keep auto-save state synced across browser tabs
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "apple-notes-auto-save") {
        if (event.newValue === "on") {
          setAutoSave(true);
          setAutoSaveGranted(true);
          getStoredDirectoryHandle().then((stored) => {
            if (stored)
              exportDirectory.current = stored as unknown as ExportDirectory;
          });
        } else {
          setAutoSave(false);
          setAutoSaveGranted(false);
          exportDirectory.current = null;
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    autoSave,
    autoSaveGranted,
    exporting,
    exportDirectory,
    toggleAutoSave,
  };
}
