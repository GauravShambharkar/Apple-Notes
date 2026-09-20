"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Note,
  useNotesStore,
} from "@/store/useNotesStore";
import {
  parseImportedContent,
  plain,
  removeFolderFromDisk,
  removeNoteFileFromDisk,
  safeFileName,
} from "@/lib/fileExportUtils";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useCaretSync } from "@/hooks/useCaretSync";
import { NoteList } from "@/components/NoteList";
import { EditorPane } from "@/components/EditorPane";
import { Modals } from "@/components/Modals";

export default function Home() {
  const {
    notes,
    folders,
    selectedId,
    selectedFolder,
    theme,
    accent,
    updateNote,
    addNote,
    deleteNote,
    addFolder,
    deleteFolder,
    toggleFolderPin,
    renameFolder,
    selectNote,
    selectFolder,
    setTheme,
    setAccent,
    importBatch,
  } = useNotesStore();

  const { autoSave, exportDirectory, toggleAutoSave } = useAutoSave();

  const [query, setQuery] = useState("");
  const [mobileEditor, setMobileEditor] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const [folderDialog, setFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "note" | "folder";
    id: string;
    name: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  const {
    caretBar,
    commandMenu,
    setCommandMenu,
    selectionMenu,
    setSelectionMenu,
    slashMode,
    setSlashMode,
    savedSelection,
    restoreSelection,
  } = useCaretSync(titleRef, editorRef, subtitleRef);

  const selected = notes.find((note) => note.id === selectedId) || null;

  const visibleNotes = useMemo(
    () =>
      notes
        .filter((note) => {
          const folderMatch =
            selectedFolder === "all" ||
            note.folder.toLowerCase() ===
              (
                folders.find((folder) => folder.id === selectedFolder)?.name ||
                ""
              ).toLowerCase();
          const search =
            `${note.title} ${note.subtitle || ""} ${plain(note.text)} ${(note.tags || []).join(" ")}`.toLowerCase();
          return folderMatch && search.includes(query.toLowerCase());
        })
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) || b.updated - a.updated,
        ),
    [folders, notes, query, selectedFolder],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addNote();
        setMobileEditor(true);
      }
      if (event.key === "Escape") {
        setCommandMenu(null);
        setSelectionMenu(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addNote, setCommandMenu, setSelectionMenu]);

  const updateSelected = (patch: Partial<Note>) => {
    if (selected) updateNote(selected.id, patch);
  };

  const folderName =
    selectedFolder === "all"
      ? "All Notes"
      : folders.find((folder) => folder.id === selectedFolder)?.name ||
        "All Notes";

  const newNote = () => {
    addNote(selectedFolder === "all" ? "Ideas" : folderName);
    setMobileEditor(true);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName);
    setNewFolderName("");
    setFolderDialog(false);
  };

  const saveFolderRename = () => {
    if (!renameDialog || !renameFolderName.trim()) return;
    renameFolder(renameDialog.id, renameFolderName);
    setRenameDialog(null);
    setRenameFolderName("");
  };

  const confirmDeletion = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "note") {
      const noteToDelete = notes.find((n) => n.id === confirmDelete.id);
      deleteNote(confirmDelete.id);
      if (noteToDelete && exportDirectory.current) {
        await removeNoteFileFromDisk(
          exportDirectory.current,
          noteToDelete.folder,
          noteToDelete.fileName,
          noteToDelete.title,
        );
      }
    } else {
      const folderToDelete = folders.find((f) => f.id === confirmDelete.id);
      deleteFolder(confirmDelete.id);
      if (folderToDelete && exportDirectory.current) {
        await removeFolderFromDisk(
          exportDirectory.current,
          folderToDelete.name,
        );
      }
    }
    setConfirmDelete(null);
    setMobileEditor(false);
  };

  const font = useNotesStore((s) => s.font) || "sf-display";
  const resolvedTheme =
    theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : (theme as string) === "dim" || theme === "dark"
        ? "dark"
        : "light";

  const accentsArray: { name: string; color: string }[] = [
    { name: "orange", color: "#ff9f0a" },
    { name: "yellow", color: "#ffd60a" },
    { name: "red", color: "#ff453a" },
    { name: "pink", color: "#ff375f" },
    { name: "purple", color: "#bf5af2" },
    { name: "blue", color: "#0a84ff" },
    { name: "cyan", color: "#64d2ff" },
    { name: "green", color: "#30d158" },
    { name: "white", color: "#ffffff" },
  ];

  const accentColor =
    accentsArray.find((a) => a.name === accent)?.color || "#ff9f0a";

  return (
    <main
      className={`app-shell theme-${resolvedTheme} font-${font} flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]`}
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <NoteList
        notes={visibleNotes}
        allNotes={notes}
        selectedId={selectedId}
        folderName={folderName}
        folders={folders}
        selectedFolder={selectedFolder}
        query={query}
        onQuery={setQuery}
        onSelect={(id) => {
          selectNote(id);
          setMobileEditor(true);
        }}
        onFolder={(id) => selectFolder(id)}
        onDelete={(id) => {
          const note = notes.find((n) => n.id === id);
          setConfirmDelete({
            type: "note",
            id,
            name: note?.title || "Untitled note",
          });
        }}
        onNew={newNote}
        onNewFolder={() => setFolderDialog(true)}
        onDeleteFolder={(id) => {
          const folder = folders.find((f) => f.id === id);
          setConfirmDelete({
            type: "folder",
            id,
            name: folder?.name || "Folder",
          });
        }}
        onToggleFolderPin={toggleFolderPin}
        onRenameFolder={(id) => {
          const folder = folders.find((f) => f.id === id);
          if (folder) {
            setRenameDialog({ id, name: folder.name });
            setRenameFolderName(folder.name);
          }
        }}
        onImportFolder={() => {
          folderInputRef.current?.click();
        }}
        onImportNotes={() => {
          fileInputRef.current?.click();
        }}
      />

      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but supported in Chromium
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;

          const folderNotesMap: Record<
            string,
            Array<{ title: string; subtitle?: string; text: string }>
          > = {};

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.startsWith(".")) continue;

            const relativePath = file.webkitRelativePath || file.name;
            const pathSegments = relativePath.split("/");

            let folder = "Ideas";
            if (pathSegments.length > 2) {
              folder = pathSegments[1];
            } else if (pathSegments.length === 2) {
              folder = pathSegments[0];
            }

            try {
              const rawText = await file.text();
              const parsed = parseImportedContent(file.name, rawText);

              if (!folderNotesMap[folder]) {
                folderNotesMap[folder] = [];
              }

              folderNotesMap[folder].push({
                title: parsed.title,
                subtitle: parsed.subtitle,
                text: parsed.text,
              });
            } catch (err) {
              console.warn("Failed to read file:", file.name, err);
            }
          }

          const importedFolders = Object.keys(folderNotesMap);
          const allImportedNotes: Array<{
            title: string;
            subtitle?: string;
            text: string;
            folder: string;
          }> = [];

          for (const [fName, fNotes] of Object.entries(folderNotesMap)) {
            for (const n of fNotes) {
              allImportedNotes.push({
                ...n,
                folder: fName,
              });
            }
          }

          if (allImportedNotes.length > 0) {
            importBatch(importedFolders, allImportedNotes);
            setToastMessage(
              `Successfully imported ${allImportedNotes.length} note(s) across ${importedFolders.length} folder(s)!`,
            );
            setTimeout(() => setToastMessage(null), 4000);
          }

          e.target.value = "";
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.json,.html,.htm"
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;

          const targetFolderName =
            selectedFolder === "all"
              ? "Ideas"
              : folders.find((f) => f.id === selectedFolder)?.name || "Ideas";

          const importedNotes: Array<{
            title: string;
            subtitle?: string;
            text: string;
            folder: string;
          }> = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.startsWith(".")) continue;

            try {
              const rawText = await file.text();
              const parsed = parseImportedContent(file.name, rawText);
              importedNotes.push({
                title: parsed.title,
                subtitle: parsed.subtitle,
                text: parsed.text,
                folder: targetFolderName,
              });
            } catch (err) {
              console.warn("Failed to read imported file:", file.name, err);
            }
          }

          if (importedNotes.length > 0) {
            importBatch([], importedNotes);
            setToastMessage(
              `Successfully imported ${importedNotes.length} note(s)!`,
            );
            setTimeout(() => setToastMessage(null), 4000);
          }
          e.target.value = "";
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-[var(--separator)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-2xl transition-all">
          {toastMessage}
        </div>
      )}

      <EditorPane
        selected={selected}
        mobileEditor={mobileEditor}
        setMobileEditor={setMobileEditor}
        autoSave={autoSave}
        toggleAutoSave={toggleAutoSave}
        theme={theme}
        accent={accent}
        setTheme={setTheme}
        setAccent={setAccent}
        updateSelected={updateSelected}
        setConfirmDelete={setConfirmDelete}
        titleRef={titleRef}
        subtitleRef={subtitleRef}
        editorRef={editorRef}
        caretBar={caretBar}
        commandMenu={commandMenu}
        setCommandMenu={setCommandMenu}
        selectionMenu={selectionMenu}
        setSelectionMenu={setSelectionMenu}
        slashMode={slashMode}
        setSlashMode={setSlashMode}
        savedSelection={savedSelection}
        restoreSelection={restoreSelection}
      />

      <Modals
        folderDialog={folderDialog}
        setFolderDialog={setFolderDialog}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        createFolder={createFolder}
        renameDialog={renameDialog}
        setRenameDialog={setRenameDialog}
        renameFolderName={renameFolderName}
        setRenameFolderName={setRenameFolderName}
        saveFolderRename={saveFolderRename}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        confirmDeletion={confirmDeletion}
      />
    </main>
  );
}
