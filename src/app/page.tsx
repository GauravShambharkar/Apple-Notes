"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LuBold,
  LuCheck,
  LuChevronDown,
  LuFileText,
  LuFolder,
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
} from "react-icons/lu";
import {
  type Accent,
  type Note,
  type Theme,
  useNotesStore,
} from "@/store/useNotesStore";

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
    <button className={`note-row group block w-full rounded-lg border-b border-[var(--separator)] px-3 py-3 text-left transition-colors ${active ? "active bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--accent)_9%,transparent)]"}`} onClick={onClick}>
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
}: {
  notes: Note[];
  selectedId: string;
  folderName: string;
  folders: { id: string; name: string; icon: string }[];
  selectedFolder: string;
  query: string;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onFolder: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [view, setView] = useState<"notes" | "folders">("notes");
  return (
    <section className="notes-panel flex h-screen min-w-0 flex-col overflow-hidden border-r border-[var(--separator)] bg-[var(--background)]">
      <header className="notes-panel-header shrink-0 border-b border-[var(--separator)] p-4">
        <div className="notes-title-line mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="eyebrow mb-0.5 block text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--text-tertiary)]">My notes</span>
            <h1 className="m-0 text-2xl font-bold leading-tight tracking-normal">{folderName}</h1>
          </div>
          <IconButton label="New note" onClick={onNew}>
            <LuPlus />
          </IconButton>
        </div>
        <div className="mb-3 flex rounded-lg bg-[var(--surface)] p-1">
          <button className={`flex h-8 flex-1 items-center justify-center gap-2 rounded-md text-xs ${view === "notes" ? "bg-[var(--background)] font-semibold shadow-sm" : "text-[var(--text-secondary)]"}`} onClick={() => setView("notes")}><LuFileText /> Notes</button>
          <button className={`flex h-8 flex-1 items-center justify-center gap-2 rounded-md text-xs ${view === "folders" ? "bg-[var(--background)] font-semibold shadow-sm" : "text-[var(--text-secondary)]"}`} onClick={() => setView("folders")}><LuFolder /> Folders</button>
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
          <span>{view === "folders" ? `${folders.length} folders` : `${notes.length} notes`}</span>
          <button className="flex items-center gap-1 bg-transparent text-[var(--text-secondary)]">
            Recently Edited <LuChevronDown />
          </button>
        </div>
      </header>
      <div className="note-list min-h-0 flex-1 overflow-y-auto p-2" role="list">
        {view === "folders" ? folders.map((folder) => (
          <button key={folder.id} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${selectedFolder === folder.id ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-semibold" : "hover:bg-black/[.06]"}`} onClick={() => { onFolder(folder.id); setView("notes"); }}><LuFolder className="text-[var(--accent)]" /><span className="flex-1">{folder.name}</span><span className="text-xs text-[var(--text-tertiary)]">{folder.id === "all" ? notes.length : notes.filter((note) => note.folder.toLowerCase() === folder.name.toLowerCase()).length}</span></button>
        )) : notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            active={note.id === selectedId}
            onClick={() => onSelect(note.id)}
            onDelete={() => onDelete(note.id)}
          />
        ))}
      </div>
      <footer className="notes-footer flex h-10 items-center justify-between border-t border-[var(--separator)] px-4 text-[11px] text-[var(--text-tertiary)]">
        <span>Saved locally</span>
        <button className="text-[var(--accent)]" onClick={onNew}>
          <LuPlus />
        </button>
      </footer>
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
          <p className="m-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Appearance</p>
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
          <p className="m-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Accent color</p>
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
    selectNote,
    selectFolder,
    setTheme,
    setAccent,
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
  const [mobileEditor, setMobileEditor] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const [slashMode, setSlashMode] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const selected = notes.find((note) => note.id === selectedId) || null;
  const visibleNotes = useMemo(
    () =>
      notes
        .filter((note) => {
          const folderMatch =
            selectedFolder === "all" ||
            note.folder.toLowerCase() === selectedFolder;
          const search =
            `${note.title} ${note.subtitle || ""} ${plain(note.text)} ${(note.tags || []).join(" ")}`.toLowerCase();
          return folderMatch && search.includes(query.toLowerCase());
        })
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) || b.updated - a.updated,
        ),
    [notes, query, selectedFolder],
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
      if (!selection || selection.isCollapsed || !selection.toString().trim() || !editorRef.current?.contains(selection.anchorNode)) {
        setSelectionMenu(null);
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
    return () => document.removeEventListener("selectionchange", handleSelection);
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
      : selectedFolder === "deleted"
        ? "Recently Deleted"
        : selectedFolder[0].toUpperCase() + selectedFolder.slice(1);
  const newNote = () => {
    addNote(
      selectedFolder === "all" || selectedFolder === "deleted"
        ? "Ideas"
        : folderName,
    );
    setMobileEditor(true);
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
      if (range?.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
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
  const insertList = (type: "bullet" | "number" | "check") => {
    restoreSelection();
    const range = window.getSelection()?.getRangeAt(0);
    if (slashMode &&
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
        '<ul class="checklist"><li><label><input type="checkbox"> <span>New task</span></label></li></ul>',
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
        <span>
          {selected.pinned && <LuPin />} Edited {dateLabel(selected.updated)}
        </span>
        <span>{(selected.tags || []).map((tag) => `#${tag}`).join("  ")}</span>
      </div>
      <h1
        ref={titleRef}
        className="editor-title mt-4 block min-h-[46px] w-full border-0 bg-transparent text-[clamp(32px,4vw,40px)] font-bold leading-[1.15] tracking-normal text-[var(--text-primary)] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Note title"
        data-placeholder="New note"
        onInput={(e) => updateSelected({ title: e.currentTarget.textContent || "" })}
      />
      <input
        className="editor-subtitle mt-2 block w-full border-0 bg-transparent text-lg leading-7 text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)]"
        value={selected.subtitle || ""}
        onChange={(e) => updateSelected({ subtitle: e.target.value })}
        placeholder="Add a subtitle"
      />
      <div
        className="editor-content mt-8 min-h-[520px] w-full whitespace-normal text-[17px] leading-[1.55] text-[var(--text-primary)] outline-none selection:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
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
        onDelete={deleteNote}
        onNew={newNote}
      />
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
            <span className="toolbar-location ml-2 text-xs text-[var(--text-tertiary)]">
              {selected?.folder || "All Notes"}
            </span>
          </div>
          <div className="toolbar-right relative flex items-center gap-1">
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
                    deleteNote(selected.id);
                    setMobileEditor(false);
                  }}
                >
                  <LuTrash2 />
                </IconButton>
              </>
            )}
          </div>
        </header>
        <div className="editor-scroll h-[calc(100vh-var(--toolbar-height))] overflow-y-auto">
          <article className="editor-document mx-auto min-h-full w-[min(840px,calc(100%-96px))] px-0 pb-24 pt-11 max-[767px]:w-[calc(100%-32px)] max-[767px]:pt-7">{editor}</article>
        </div>
        {commandMenu && <CommandMenu position={commandMenu} onList={insertList} onBlock={(tag) => command("formatBlock", tag)} onCommand={command} onColor={(color) => command("foreColor", color)} />}
        {selectionMenu && <CommandMenu position={selectionMenu} onList={insertList} onBlock={(tag) => command("formatBlock", tag)} onCommand={command} onColor={(color) => command("foreColor", color)} />}
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
    <div className="command-menu fixed z-20 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-2 shadow-xl" style={position} onMouseDown={(event) => event.preventDefault()}>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onList("bullet")} aria-label="Bullet list">
        <LuList />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onList("number")} aria-label="Numbered list">
        <LuListOrdered />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onList("check")} aria-label="Checklist">
        <LuCheck />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onBlock("h1")} aria-label="Headline">
        H1
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onBlock("h4")} aria-label="Heading 4">
        H4
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onBlock("p")} aria-label="Body text">
        <LuFileText />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onCommand("bold")} aria-label="Bold">
        <LuBold />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => onCommand("underline")} aria-label="Underline">
        <LuUnderline />
      </button>
      <div className="relative">
        <button className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" onClick={() => setShowColors((open) => !open)} aria-label="Color palette">
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
