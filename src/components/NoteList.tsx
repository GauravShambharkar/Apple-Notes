import { useState } from "react";
import {
  LuChevronDown,
  LuEllipsisVertical,
  LuFileText,
  LuFileUp,
  LuFolder,
  LuFolderInput,
  LuFolderPlus,
  LuPin,
  LuPlus,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { TbFileImport } from "react-icons/tb";
import type { Folder, Note } from "@/store/useNotesStore";
import { IconButton } from "@/components/IconButton";
import { NoteRow } from "@/components/NoteRow";

export function NoteList({
  notes,
  allNotes,
  selectedId,
  folderName,
  folders,
  selectedFolder,
  query,
  onQuery,
  onSelect,
  onFolder,
  onDelete,
  onNew,
  onNewFolder,
  onDeleteFolder,
  onToggleFolderPin,
  onRenameFolder,
  onImportFolder,
  onImportNotes,
}: {
  notes: Note[];
  allNotes: Note[];
  selectedId: string;
  folderName: string;
  folders: Folder[];
  selectedFolder: string;
  query: string;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onFolder: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onNewFolder: () => void;
  onDeleteFolder: (id: string) => void;
  onToggleFolderPin: (id: string) => void;
  onRenameFolder: (id: string) => void;
  onImportFolder: () => void;
  onImportNotes: () => void;
}) {
  const [view, setView] = useState<"notes" | "folders">("notes");
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <section className="notes-panel flex h-screen min-w-0 flex-col overflow-hidden border-r border-[var(--separator)] bg-[var(--background)]">
      <header className="notes-panel-header shrink-0 border-b border-[var(--separator)] p-4">
        <div className="notes-title-line mb-4 flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="eyebrow mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              My notes
            </span>
            <h1 className="m-0 text-2xl font-bold leading-tight tracking-wide">
              {folderName}
            </h1>
          </div>
          <div className="relative flex items-center gap-1">
            <IconButton
              label="Import notes or folder"
              onClick={() => setImportOpen(!importOpen)}
            >
              <TbFileImport />
            </IconButton>
            {importOpen && (
              <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-1.5 shadow-2xl">
                <p className="m-1.5 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                  Import Options
                </p>
                <button
                  className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs text-[var(--text-primary)] hover:bg-black/[.06] dark:hover:bg-white/[.08]"
                  onClick={() => {
                    setImportOpen(false);
                    onImportFolder();
                  }}
                >
                  <LuFolderInput className="text-sm text-[var(--accent)]" />
                  <span className="font-medium">Import Folder</span>
                </button>
                <button
                  className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs text-[var(--text-primary)] hover:bg-black/[.06] dark:hover:bg-white/[.08]"
                  onClick={() => {
                    setImportOpen(false);
                    onImportNotes();
                  }}
                >
                  <LuFileUp className="text-sm text-[var(--accent)]" />
                  <span className="font-medium">Import Notes Only</span>
                </button>
              </div>
            )}
            {view === "folders" ? (
              <IconButton label="New folder" onClick={onNewFolder}>
                <LuFolderPlus />
              </IconButton>
            ) : (
              <IconButton label="New note" onClick={onNew}>
                <LuPlus />
              </IconButton>
            )}
          </div>
        </div>
        <div className="mb-3 flex rounded-lg bg-[var(--surface)] p-1">
          <button
            className={`flex h-8 flex-1 items-center justify-center gap-2 rounded-md text-xs ${view === "notes" ? "bg-[var(--background)] font-semibold shadow-sm" : "text-[var(--text-secondary)]"}`}
            onClick={() => setView("notes")}
          >
            <LuFileText /> Notes
          </button>
          <button
            className={`flex h-8 flex-1 items-center justify-center gap-2 rounded-md text-xs ${view === "folders" ? "bg-[var(--background)] font-semibold shadow-sm" : "text-[var(--text-secondary)]"}`}
            onClick={() => setView("folders")}
          >
            <LuFolder /> Folders
          </button>
        </div>
        <div className="search-field flex h-8 items-center gap-2 rounded-[8px] bg-[var(--surface)] px-2 text-[var(--text-tertiary)]">
          <LuSearch />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent text-[var(--text-primary)] outline-none"
            aria-label="Search notes"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
          />
          <kbd>⌘ F</kbd>
        </div>
        <div className="notes-sort mt-3 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
          <span>
            {view === "folders"
              ? `${folders.length} folders`
              : `${notes.length} notes`}
          </span>
          <button className="flex items-center gap-1 bg-transparent text-[var(--text-secondary)]">
            Recently Edited <LuChevronDown />
          </button>
        </div>
      </header>
      <div className="note-list min-h-0 flex-1 overflow-y-auto p-2" role="list">
        {view === "folders"
          ? [...folders]
              .sort((a, b) => Number(b.pinned) - Number(a.pinned))
              .map((folder) => (
                <button
                  key={folder.id}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${selectedFolder === folder.id ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-semibold" : "hover:bg-black/[.06]"}`}
                  onClick={() => {
                    onFolder(folder.id);
                    setView("notes");
                  }}
                >
                  <LuFolder className="text-[var(--accent)]" />
                  <span className="flex-1">{folder.name}</span>
                  {folder.id !== "all" && (
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-md ${folder.pinned ? "text-[var(--accent)]" : "text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100"}`}
                      role="button"
                      aria-label={`${folder.pinned ? "Unpin" : "Pin"} ${folder.name} folder`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFolderPin(folder.id);
                      }}
                    >
                      <LuPin />
                    </span>
                  )}
                  {folder.id !== "all" && (
                    <span
                      className="relative grid h-7 w-7 place-items-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      role="button"
                      aria-label={`Folder actions for ${folder.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setFolderMenu(
                          folderMenu === folder.id ? null : folder.id,
                        );
                      }}
                    >
                      <LuEllipsisVertical />
                      {folderMenu === folder.id && (
                        <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-1 shadow-xl">
                          <button
                            className="flex h-8 w-full items-center justify-between rounded-lg px-2 text-xs text-[var(--text-primary)] hover:bg-black/[.06]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenu(null);
                              onRenameFolder(folder.id);
                            }}
                          >
                            <span>Rename</span>
                          </button>
                          <button
                            className="flex h-8 w-full items-center justify-between rounded-lg px-2 text-xs text-[var(--danger)] hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenu(null);
                              onDeleteFolder(folder.id);
                            }}
                          >
                            <span>Delete</span>
                            <LuTrash2 />
                          </button>
                        </div>
                      )}
                    </span>
                  )}
                  <span className="count rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                    {folder.id === "all"
                      ? allNotes.length
                      : allNotes.filter(
                          (note) =>
                            note.folder.toLowerCase() ===
                            folder.name.toLowerCase(),
                        ).length}
                  </span>
                </button>
              ))
          : notes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                active={note.id === selectedId}
                onClick={() => onSelect(note.id)}
                onDelete={() => onDelete(note.id)}
              />
            ))}
      </div>
    </section>
  );
}
