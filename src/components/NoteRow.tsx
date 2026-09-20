import { LuPin, LuTrash2 } from "react-icons/lu";
import type { Note } from "@/store/useNotesStore";
import { dateLabel, plain } from "@/lib/fileExportUtils";

export function NoteRow({
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
