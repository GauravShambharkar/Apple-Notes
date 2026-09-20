"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LuBold,
  LuCheck,
  LuChevronDown,
  LuCloud,
  LuCloudOff,
  LuEllipsisVertical,
  LuFileText,
  LuFileUp,
  LuFolder,
  LuFolderInput,
  LuFolderPlus,
  LuList,
  LuListOrdered,
  LuMonitor,
  LuMoon,
  LuPalette,
  LuPin,
  LuPlus,
  LuSearch,
  LuShare2,
  LuSun,
  LuTrash2,
  LuUnderline,
  LuUpload,
} from "react-icons/lu";
import {
  type Accent,
  type Note,
  type Theme,
  useNotesStore,
} from "@/store/useNotesStore";
import {
  clearStoredDirectoryHandle,
  getStoredDirectoryHandle,
  saveDirectoryHandle,
} from "@/lib/idbHandleStore";
import { TbFileImport } from "react-icons/tb";

const accents: { name: Accent; color: string }[] = [
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

function parseImportedContent(filename: string, rawText: string) {
  const baseName = filename.replace(/\.[^/.]+$/, "");

  if (filename.toLowerCase().endsWith(".json")) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed.title || parsed.text) {
        return {
          title: parsed.title || baseName,
          subtitle: parsed.subtitle || "",
          text: parsed.text || "",
        };
      }
    } catch {}
  }

  if (
    filename.toLowerCase().endsWith(".html") ||
    filename.toLowerCase().endsWith(".htm")
  ) {
    return {
      title: baseName,
      subtitle: "",
      text: rawText,
    };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter((l) => l.length > 0);

  let title = baseName;
  let subtitle = "";
  let bodyLines = lines;

  if (nonEmpty.length > 0) {
    title = nonEmpty[0].replace(/^#+\s*/, "");
    if (nonEmpty.length > 1) {
      subtitle = nonEmpty[1].replace(/^#+\s*/, "");
      bodyLines = lines.slice(lines.indexOf(nonEmpty[0]) + 1);
    } else {
      bodyLines = lines.slice(lines.indexOf(nonEmpty[0]) + 1);
    }
  }

  const htmlText = bodyLines
    .map((line) => (line ? `<p>${line}</p>` : "<p><br></p>"))
    .join("");

  return {
    title: title || baseName,
    subtitle,
    text: htmlText || `<p>${rawText}</p>`,
  };
}

function dateLabel(date: number) {
  const day = new Date(date);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return "Today";
  return day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function plain(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function safeFileName(value: string, fallback: string) {
  return (value.trim() || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}
type ExportFile = {
  createWritable: () => Promise<{
    write: (content: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};
type ExportDirectory = {
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<ExportDirectory>;
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<ExportFile>;
  removeEntry?: (
    name: string,
    options?: { recursive?: boolean },
  ) => Promise<void>;
  requestPermission?: () => Promise<"granted" | "denied">;
};
type ExportManifest = { files: Record<string, string>; folders: string[] };
async function writeNotesToDirectory(root: ExportDirectory, notes: Note[]) {
  const previous: ExportManifest = JSON.parse(
    localStorage.getItem("apple-notes-export-manifest") ||
      '{"files":{},"folders":[]}',
  );
  const usedNames = new Map<string, number>();
  const files: Record<string, string> = {};
  const folders = new Set<string>();
  for (const note of notes) {
    const folder = safeFileName(note.folder, "Unfiled");
    const baseName = safeFileName(note.title, "Untitled note");
    const count = usedNames.get(`${folder}/${baseName}`) || 0;
    usedNames.set(`${folder}/${baseName}`, count + 1);
    const fileName = count ? `${baseName} (${count + 1})` : baseName;
    const path = `${folder}/${fileName}.txt`;
    files[note.id] = path;
    folders.add(folder);
    const content = [
      note.title || "Untitled note",
      note.subtitle || "",
      "",
      plain(note.text),
    ].join("\n");
    const folderHandle = await root.getDirectoryHandle(folder, {
      create: true,
    });
    const fileHandle = await folderHandle.getFileHandle(`${fileName}.txt`, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
  const currentPaths = new Set(Object.values(files));
  for (const oldPath of Object.values(previous.files)) {
    // A deleted note can be replaced by a new note with the same path.
    // Compare paths so cleanup never removes the replacement file.
    if (currentPaths.has(oldPath)) continue;
    const [folder, file] = oldPath.split("/");
    try {
      const folderHandle = await root.getDirectoryHandle(folder);
      await folderHandle.removeEntry?.(file);
    } catch {
      /* The file may already be gone. */
    }
  }
  for (const folder of previous.folders) {
    if (folders.has(folder)) continue;
    try {
      await root.removeEntry?.(folder, { recursive: true });
    } catch {
      /* The folder may already be gone. */
    }
  }
  localStorage.setItem(
    "apple-notes-export-manifest",
    JSON.stringify({ files, folders: [...folders] } satisfies ExportManifest),
  );
}
function IconButton({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      className={`icon-button grid h-8 w-8 place-items-center rounded-lg bg-transparent text-[var(--text-secondary)] transition-colors hover:bg-black/[.06] hover:text-[var(--text-primary)] ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NoteRow({
  note,
  active,
  onClick,
  onDelete,
}: {
  note: Note;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      className={`note-row group block w-full rounded-lg border-b border-[var(--separator)] px-3 py-3 text-left transition-colors ${active ? "active bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--accent)_9%,transparent)]"}`}
      onClick={onClick}
    >
      <div className="note-row-title flex items-center justify-between gap-2">
        <strong>{note.title || "Untitled note"}</strong>
        <span className="note-row-actions flex items-center gap-2 text-[var(--accent)]">
          {note.pinned && <LuPin />}
          <span
            className="row-delete grid place-items-center text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--danger)]"
            role="button"
            aria-label="Delete note"
            title="Delete note"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <LuTrash2 />
          </span>
        </span>
      </div>
      <div className="note-row-meta mt-1 flex gap-2 overflow-hidden whitespace-nowrap text-xs text-[var(--text-tertiary)]">
        <time>{dateLabel(note.updated)}</time>
        <span>{plain(note.text).slice(0, 76) || "No additional text"}</span>
      </div>
    </button>
  );
}

function NoteList({
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
  folders: { id: string; name: string; icon: string; pinned?: boolean }[];
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
                        <span
                          className="absolute right-0 top-8 z-10 w-32 rounded-lg border border-[var(--separator)] bg-[var(--surface)] p-1 text-left shadow-xl"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-black/5"
                            onClick={() => {
                              onRenameFolder(folder.id);
                              setFolderMenu(null);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-[var(--danger)] hover:bg-red-500/10"
                            onClick={() => {
                              onDeleteFolder(folder.id);
                              setFolderMenu(null);
                            }}
                          >
                            Delete
                          </button>
                        </span>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-tertiary)]">
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
      {/* <footer className="notes-footer flex h-10 items-center justify-between border-t border-[var(--separator)] px-4 text-[11px] text-[var(--text-tertiary)]">
        <span>Saved locally</span>
        <button className="text-[var(--accent)]" onClick={onNew}>
          <LuPlus />
        </button>
      </footer> */}
    </section>
  );
}

function ThemeMenu({
  theme,
  accent,
  setTheme,
  setAccent,
}: {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="appearance-control relative">
      <button
        className="appearance-button flex h-8 items-center gap-1 rounded-lg bg-transparent px-2 text-xs text-[var(--text-secondary)] transition-colors hover:bg-black/[.06]"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="appearance-icon text-[var(--accent)]">
          {theme === "dark" ? (
            <LuMoon />
          ) : theme === "system" ? (
            <LuMonitor />
          ) : (
            <LuSun />
          )}
        </span>
        <span>
          {theme === "system"
            ? "System"
            : theme[0].toUpperCase() + theme.slice(1)}
        </span>
        <LuChevronDown />
      </button>
      {open && (
        <div className="appearance-menu absolute right-0 top-10 z-20 w-44 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-2 shadow-xl">
          <p className="m-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
            Appearance
          </p>
          {(["light", "dark", "system"] as Theme[]).map((item) => (
            <button
              key={item}
              className={`flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs ${theme === item ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" : "hover:bg-black/[.06]"}`}
              onClick={() => {
                setTheme(item);
                setOpen(false);
              }}
            >
              {item === "light" ? (
                <LuSun />
              ) : item === "dark" ? (
                <LuMoon />
              ) : (
                <LuMonitor />
              )}{" "}
              <span>{item[0].toUpperCase() + item.slice(1)}</span>
              {theme === item && <LuCheck />}
            </button>
          ))}
          <p className="m-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
            Accent color
          </p>
          <div className="accent-grid flex w-full flex-wrap gap-2 p-2">
            {accents.map((item) => (
              <button
                key={item.name}
                aria-label={`${item.name} accent`}
                className={`h-4 w-4 shrink-0 rounded-full border-2 border-[var(--surface)] bg-[var(--swatch)] ${accent === item.name ? "ring-2 ring-[var(--accent)]" : "ring-1 ring-[var(--separator)]"}`}
                style={{ "--swatch": item.color } as React.CSSProperties}
                onClick={() => {
                  setAccent(item.name);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    setFont,
    importBatch,
  } = useNotesStore();
  const [query, setQuery] = useState("");
  const [commandMenu, setCommandMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [caretBar, setCaretBar] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const [mobileEditor, setMobileEditor] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [autoSaveGranted, setAutoSaveGranted] = useState(false);
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
  const exportDirectory = useRef<ExportDirectory | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const [slashMode, setSlashMode] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const selected = notes.find((note) => note.id === selectedId) || null;
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
          await writeNotesToDirectory(root, notes);
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
      await writeNotesToDirectory(root, notes);
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
        setAutoSave(true);
        setAutoSaveGranted(true);
        try {
          const perm = await (
            stored as unknown as {
              queryPermission?: (opts: { mode: string }) => Promise<string>;
            }
          ).queryPermission?.({ mode: "readwrite" });
          if (perm === "granted") {
            await writeNotesToDirectory(exportDirectory.current, notes);
          }
        } catch {}
      }
    };
    initAutoSave();
  }, []);

  // Continuous auto-save to directory whenever notes state changes
  useEffect(() => {
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
  const resolvedTheme =
    theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : (theme as string) === "dim" || theme === "dark"
        ? "dark"
        : "light";
  // Do not rehydrate while typing: replacing innerHTML on every keystroke reverses caret input.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (editorRef.current && selected)
      editorRef.current.innerHTML = selected.text;
    if (titleRef.current && selected)
      titleRef.current.textContent = selected.title;
  }, [selectedId]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        !selection.toString().trim() ||
        !editorRef.current?.contains(selection.anchorNode)
      ) {
        setSelectionMenu(null);
        if (!selection?.isCollapsed) setCaretBar(null);
        return;
      }
      savedSelection.current = selection.getRangeAt(0).cloneRange();
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setCommandMenu(null);
      setSlashMode(false);
      setSelectionMenu({
        top: Math.min(window.innerHeight - 56, rect.bottom + 8),
        left: Math.max(12, Math.min(window.innerWidth - 300, rect.left)),
      });
    };
    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
  }, []);
  useEffect(() => {
    const syncCaret = () => {
      const selection = window.getSelection();
      if (!selection || !selection.isCollapsed || !selection.anchorNode) {
        setCaretBar(null);
        return;
      }
      const inTitle = !!titleRef.current?.contains(selection.anchorNode);
      const inBody = !!editorRef.current?.contains(selection.anchorNode);
      if (!inTitle && !inBody) {
        setCaretBar(null);
        return;
      }
      const host = inTitle ? titleRef.current : editorRef.current;
      const range = selection.getRangeAt(0);

      let top = 0;
      let left = 0;
      let height = inTitle ? 42 : 26;
      let measured = false;

      const clientRects = range.getClientRects();
      if (clientRects.length > 0) {
        const lastRect = clientRects[clientRects.length - 1];
        if (lastRect && lastRect.height > 0 && lastRect.top > 0) {
          top = lastRect.top;
          left = lastRect.left;
          height = lastRect.height;
          measured = true;
        }
      }

      if (!measured) {
        const rangeRect = range.getBoundingClientRect();
        if (rangeRect && rangeRect.height > 0 && rangeRect.top > 0) {
          top = rangeRect.top;
          left = rangeRect.left;
          height = rangeRect.height;
          measured = true;
        }
      }

      if (!measured && selection.anchorNode) {
        try {
          const marker = document.createElement("span");
          marker.appendChild(document.createTextNode("\u200b"));
          const clonedRange = range.cloneRange();
          clonedRange.insertNode(marker);
          const markerRect = marker.getBoundingClientRect();
          if (markerRect && markerRect.top > 0) {
            top = markerRect.top;
            left = markerRect.left;
            if (markerRect.height > 0) height = markerRect.height;
            measured = true;
          }
          marker.parentNode?.removeChild(marker);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch {}
      }

      if (!measured && host) {
        const fallback = host.getBoundingClientRect();
        top = fallback.top;
        left = fallback.left;
      }

      setCaretBar({ top, left, height });
    };

    document.addEventListener("selectionchange", syncCaret);
    window.addEventListener("resize", syncCaret);
    window.addEventListener("scroll", syncCaret, true);
    window.addEventListener("keyup", syncCaret);
    window.addEventListener("keydown", syncCaret);
    return () => {
      document.removeEventListener("selectionchange", syncCaret);
      window.removeEventListener("resize", syncCaret);
      window.removeEventListener("scroll", syncCaret, true);
      window.removeEventListener("keyup", syncCaret);
      window.removeEventListener("keydown", syncCaret);
    };
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
  }, [addNote]);
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
  const confirmDeletion = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "note") deleteNote(confirmDelete.id);
    else deleteFolder(confirmDelete.id);
    setConfirmDelete(null);
    setMobileEditor(false);
  };
  const restoreSelection = () => {
    if (!savedSelection.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedSelection.current);
  };
  const command = (name: string, value?: string) => {
    restoreSelection();
    if (slashMode) {
      const range = window.getSelection()?.getRangeAt(0);
      if (
        range?.startContainer.nodeType === Node.TEXT_NODE &&
        range.startOffset > 0
      ) {
        range.setStart(range.startContainer, range.startOffset - 1);
        range.deleteContents();
      }
      setSlashMode(false);
    }
    document.execCommand(name, false, value);
    if (editorRef.current)
      updateSelected({ text: editorRef.current.innerHTML });
    setCommandMenu(null);
    setSelectionMenu(null);
    editorRef.current?.focus();
  };
  const onInput = (event: FormEvent<HTMLDivElement>) => {
    const editor = event.currentTarget;
    updateSelected({ text: editor.innerHTML });
    const text = editor.textContent || "";
    if (text.endsWith("/")) {
      const range = window.getSelection()?.getRangeAt(0);
      if (range) {
        savedSelection.current = range.cloneRange();
        setSlashMode(true);
      }
      const rect =
        range?.getBoundingClientRect() || editor.getBoundingClientRect();
      setCommandMenu({
        top: rect.bottom + 8,
        left: Math.max(16, Math.min(window.innerWidth - 240, rect.left)),
      });
    } else setCommandMenu(null);
  };
  const onEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);

      let node: Node | null = range.startContainer;
      let liElement: HTMLLIElement | null = null;
      while (node && node !== editorRef.current) {
        if (
          node.nodeName === "LI" &&
          (node as HTMLElement).parentElement?.classList.contains("checklist")
        ) {
          liElement = node as HTMLLIElement;
          break;
        }
        node = node.parentNode;
      }

      if (liElement) {
        event.preventDefault();
        const span = liElement.querySelector("span");
        const rawText = (span ? span.textContent : liElement.textContent || "")
          .replace(/[\u200b\s]/g, "");

        if (!rawText) {
          // Exit checklist if Enter is pressed on a completely empty item
          const parentUl = liElement.parentElement;
          liElement.remove();
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          if (parentUl && parentUl.children.length === 0) {
            parentUl.replaceWith(p);
          } else if (parentUl) {
            parentUl.after(p);
          } else {
            editorRef.current?.appendChild(p);
          }
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Add a new checklist item
          const newLi = document.createElement("li");
          newLi.innerHTML = '<input type="checkbox"> <span><br></span>';
          liElement.after(newLi);

          const newSpan = newLi.querySelector("span");
          if (newSpan) {
            const newRange = document.createRange();
            newRange.setStart(newSpan, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }

        if (editorRef.current) {
          updateSelected({ text: editorRef.current.innerHTML });
        }
      }
    }
  };
  const insertList = (type: "bullet" | "number" | "check") => {
    restoreSelection();
    const range = window.getSelection()?.getRangeAt(0);
    if (
      slashMode &&
      range?.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset > 0
    ) {
      range.setStart(range.startContainer, range.startOffset - 1);
      range.deleteContents();
    }
    setSlashMode(false);
    if (type === "check")
      document.execCommand(
        "insertHTML",
        false,
        '<ul class="checklist"><li><input type="checkbox"> <span><br></span></li></ul>',
      );
    else
      document.execCommand(
        type === "bullet" ? "insertUnorderedList" : "insertOrderedList",
      );
    if (editorRef.current)
      updateSelected({ text: editorRef.current.innerHTML });
    setCommandMenu(null);
    setSelectionMenu(null);
    editorRef.current?.focus();
  };
  const editor = selected ? (
    <>
      <div className="editor-meta flex min-h-[18px] items-center gap-3 text-xs text-[var(--text-tertiary)]">
        <span className="tracking-wide flex items-center gap-1">
          {selected.pinned && <LuPin />} Edited {dateLabel(selected.updated)}
        </span>
        <span>{(selected.tags || []).map((tag) => `#${tag}`).join("  ")}</span>
      </div>
      <h1
        ref={titleRef}
        className="editor-title mt-4 block min-h-[46px] w-full border-0 bg-transparent text-[clamp(32px,4vw,40px)] font-bold leading-[1.15] tracking-wide text-[var(--text-primary)] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Note title"
        data-placeholder="New note"
        onInput={(e) =>
          updateSelected({ title: e.currentTarget.textContent || "" })
        }
      />
      <input
        className="editor-subtitle mt-2 block w-full tracking-wide border-0 bg-transparent text-lg leading-7 text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)]"
        value={selected.subtitle || ""}
        onChange={(e) => updateSelected({ subtitle: e.target.value })}
        placeholder="Add a subtitle"
      />
      <div
        className="editor-content mt-8 min-h-[520px] w-full whitespace-normal text-[17px] leading-[1.55] tracking-wide text-[var(--text-primary)] outline-none selection:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={onEditorKeyDown}
        onClick={(e) => {
          const target = e.target as HTMLInputElement;
          if (target.type === "checkbox") {
            target.toggleAttribute("checked", target.checked);
            if (editorRef.current)
              updateSelected({ text: editorRef.current.innerHTML });
          }
        }}
        data-placeholder="Start writing something beautiful..."
      />
    </>
  ) : (
    <div className="editor-empty flex h-[calc(100vh-var(--toolbar-height))] flex-col items-center justify-center text-[var(--text-tertiary)]">
      <LuFileText />
      <h2>No note selected</h2>
      <p>Create a note to begin writing.</p>
      <button onClick={newNote}>New note</button>
    </div>
  );
  return (
    <main
      className={`notes-app grid h-screen w-screen min-h-0 overflow-hidden bg-[var(--background)] text-[var(--text-primary)] [grid-template-columns:var(--list-width)_minmax(500px,1fr)] max-[767px]:block theme-${resolvedTheme} ${resolvedTheme === "dark" ? "dark" : ""} accent-${accent}`}
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
        onFolder={selectFolder}
        onDelete={(id) => {
          const note = notes.find((item) => item.id === id);
          setConfirmDelete({
            type: "note",
            id,
            name: note?.title || "Untitled note",
          });
        }}
        onNew={newNote}
        onNewFolder={() => setFolderDialog(true)}
        onToggleFolderPin={toggleFolderPin}
        onRenameFolder={(id) => {
          const folder = folders.find((item) => item.id === id);
          if (folder) {
            setRenameFolderName(folder.name);
            setRenameDialog({ id, name: folder.name });
          }
        }}
        onDeleteFolder={(id) => {
          const folder = folders.find((item) => item.id === id);
          if (folder)
            setConfirmDelete({ type: "folder", id, name: folder.name });
        }}
        onImportFolder={() => folderInputRef.current?.click()}
        onImportNotes={() => fileInputRef.current?.click()}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        onChange={async (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;

          const importedFoldersSet = new Set<string>();
          const importedNotes: Array<{
            title: string;
            subtitle?: string;
            text: string;
            folder: string;
          }> = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.startsWith(".")) continue;

            const relPath = file.webkitRelativePath || file.name;
            const parts = relPath.split(/[\/\\]/);

            let folderName =
              selectedFolder === "all"
                ? "Ideas"
                : folders.find((f) => f.id === selectedFolder)?.name || "Ideas";

            if (parts.length > 2) {
              folderName = parts[parts.length - 2];
            } else if (parts.length === 2) {
              folderName = parts[0];
            }

            if (folderName && folderName !== "all") {
              importedFoldersSet.add(folderName);
            }

            try {
              const rawText = await file.text();
              const parsed = parseImportedContent(file.name, rawText);
              importedNotes.push({
                title: parsed.title,
                subtitle: parsed.subtitle,
                text: parsed.text,
                folder: folderName,
              });
            } catch (err) {
              console.warn("Failed to read imported file:", file.name, err);
            }
          }

          if (importedNotes.length > 0) {
            importBatch([...importedFoldersSet], importedNotes);
            setToastMessage(
              `Successfully imported ${importedNotes.length} note(s) and ${importedFoldersSet.size} folder(s)!`,
            );
            setTimeout(() => setToastMessage(null), 4000);
          }
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".txt,.md,.json,.html"
        multiple
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
      <section
        className={`editor-pane relative min-w-0 h-screen overflow-hidden bg-[var(--editor)] max-[767px]:fixed max-[767px]:inset-0 max-[767px]:z-40 max-[767px]:hidden ${mobileEditor ? "mobile-visible max-[767px]:block" : ""}`}
      >
        <header className="top-toolbar flex h-[var(--toolbar-height)] items-center justify-between border-b border-[var(--separator)] px-5 max-[767px]:px-3">
          <div className="toolbar-left flex items-center gap-1">
            {mobileEditor && (
              <button
                className="mobile-back flex items-center gap-1 bg-transparent text-sm text-[var(--accent)]"
                onClick={() => setMobileEditor(false)}
              >
                <LuChevronDown /> Notes
              </button>
            )}
            {/* <span className="toolbar-location ml-2 text-xs text-[var(--text-tertiary)]">
              {selected?.folder || "All Notes"}
            </span> */}
          </div>
          <div className="toolbar-right relative flex items-center gap-1">
            <p className="text-[16px]  text-black dark:text-white/30 flex items-center w-fit">
              Auto save
              <IconButton
                label={autoSave ? "Auto-save on" : "Turn auto-save on"}
                onClick={toggleAutoSave}
                className={
                  autoSave
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-tertiary)]"
                }
              >
                {autoSave ? <LuCloud /> : <LuCloudOff />}
              </IconButton>
            </p>
            <ThemeMenu
              theme={theme}
              accent={accent}
              setTheme={setTheme}
              setAccent={setAccent}
            />
            {selected && (
              <>
                <IconButton
                  label="Pin note"
                  className={selected.pinned ? "text-[var(--accent)]" : ""}
                  onClick={() => updateSelected({ pinned: !selected.pinned })}
                >
                  <LuPin />
                </IconButton>
                <IconButton label="Share note">
                  <LuShare2 />
                </IconButton>
                <IconButton
                  label="Delete note"
                  className="text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-[var(--danger)]"
                  onClick={() => {
                    setConfirmDelete({
                      type: "note",
                      id: selected.id,
                      name: selected.title || "Untitled note",
                    });
                  }}
                >
                  <LuTrash2 />
                </IconButton>
              </>
            )}
          </div>
        </header>
        {caretBar && (
          <span
            className="pointer-events-none fixed z-30 w-[2px] animate-[caret-blink_1s_steps(2,start)_infinite] bg-[var(--accent)]"
            style={{
              top: caretBar.top,
              left: caretBar.left,
              height: caretBar.height,
            }}
          />
        )}
        <div className="editor-scroll h-[calc(100vh-var(--toolbar-height))] overflow-y-auto">
          <article className="editor-document mx-auto min-h-full w-[min(840px,calc(100%-96px))] px-0 pb-24 pt-11 max-[767px]:w-[calc(100%-32px)] max-[767px]:pt-7">
            {editor}
          </article>
        </div>
        {commandMenu && (
          <CommandMenu
            position={commandMenu}
            onList={insertList}
            onBlock={(tag) => command("formatBlock", tag)}
            onCommand={command}
            onColor={(color) => command("foreColor", color)}
          />
        )}
        {selectionMenu && (
          <CommandMenu
            position={selectionMenu}
            onList={insertList}
            onBlock={(tag) => command("formatBlock", tag)}
            onCommand={command}
            onColor={(color) => command("foreColor", color)}
          />
        )}
        {(folderDialog || renameDialog || confirmDelete) && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
            onMouseDown={() => {
              setFolderDialog(false);
              setRenameDialog(null);
            }}
          >
            {folderDialog && (
              <form
                className="w-full max-w-sm rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-5 shadow-2xl"
                onSubmit={(event) => {
                  event.preventDefault();
                  createFolder();
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  New folder
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Give your notes a new place to live.
                </p>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder="Folder name"
                  className="mt-4 w-full rounded-lg border border-[var(--separator)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)]"
                    onClick={() => setFolderDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
            {renameDialog && (
              <form
                className="w-full max-w-sm rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-5 shadow-2xl"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveFolderRename();
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Rename folder
                </h2>
                <input
                  autoFocus
                  value={renameFolderName}
                  onChange={(event) => setRenameFolderName(event.target.value)}
                  className="mt-4 w-full rounded-lg border border-[var(--separator)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)]"
                    onClick={() => setRenameDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
            {confirmDelete && (
              <div
                className="w-full max-w-sm rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-5 shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Delete {confirmDelete.type === "folder" ? "folder" : "note"}?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {confirmDelete.type === "folder"
                    ? `This will delete “${confirmDelete.name}” and all notes inside it.`
                    : `“${confirmDelete.name}” will be permanently deleted.`}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)]"
                    onClick={() => setConfirmDelete(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-[var(--danger)] px-3 py-2 text-sm font-semibold text-white"
                    onClick={confirmDeletion}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function CommandMenu({
  position,
  onList,
  onBlock,
  onCommand,
  onColor,
}: {
  position: { top: number; left: number };
  onList: (type: "bullet" | "number" | "check") => void;
  onBlock: (tag: "h1" | "h4" | "p") => void;
  onCommand: (name: string, value?: string) => void;
  onColor: (color: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  return (
    <div
      className="command-menu fixed z-20 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-2 shadow-xl"
      style={position}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onList("bullet")}
        aria-label="Bullet list"
      >
        <LuList />
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onList("number")}
        aria-label="Numbered list"
      >
        <LuListOrdered />
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onList("check")}
        aria-label="Checklist"
      >
        <LuCheck />
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onBlock("h1")}
        aria-label="Headline"
      >
        H1
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onBlock("h4")}
        aria-label="Heading 4"
      >
        H4
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onBlock("p")}
        aria-label="Body text"
      >
        <LuFileText />
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onCommand("bold")}
        aria-label="Bold"
      >
        <LuBold />
      </button>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
        onClick={() => onCommand("underline")}
        aria-label="Underline"
      >
        <LuUnderline />
      </button>
      <div className="relative">
        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
          onClick={() => setShowColors((open) => !open)}
          aria-label="Color palette"
        >
          <LuPalette />
        </button>
        {showColors && (
          <div className="absolute left-full top-0 ml-2 grid w-28 grid-cols-4 gap-3 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-3 shadow-xl">
            {accents.map((item) => (
              <button
                key={item.name}
                className="h-5 w-5 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--separator)]"
                style={{ background: item.color }}
                onClick={() => onColor(item.color)}
                aria-label={`${item.name} text`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
