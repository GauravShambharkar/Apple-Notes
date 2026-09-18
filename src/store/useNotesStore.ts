import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Accent = "orange" | "yellow" | "red" | "pink" | "purple" | "blue" | "cyan" | "green";
export type Note = { id: string; title: string; subtitle: string; text: string; updated: number; pinned: boolean; folder: string; tags: string[] };
export type Folder = { id: string; name: string; icon: string };

const folders: Folder[] = [
  { id: "all", name: "All Notes", icon: "notes" },
  { id: "deleted", name: "Recently Deleted", icon: "trash" },
  { id: "work", name: "Work", icon: "folder" },
  { id: "personal", name: "Personal", icon: "folder" },
  { id: "ideas", name: "Ideas", icon: "folder" },
  { id: "projects", name: "Projects", icon: "folder" },
];

type NotesState = {
  notes: Note[];
  folders: Folder[];
  selectedId: string;
  selectedFolder: string;
  theme: Theme;
  accent: Accent;
  updateNote: (id: string, patch: Partial<Note>) => void;
  addNote: (folder?: string) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string) => void;
  selectFolder: (folder: string) => void;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
};

export const useNotesStore = create<NotesState>()(persist((set) => ({
  notes: [],
  folders,
  selectedId: "",
  selectedFolder: "all",
  theme: "system",
  accent: "orange",
  updateNote: (id, patch) => set((state) => ({ notes: state.notes.map((note) => note.id === id ? { ...note, ...patch, updated: Date.now() } : note) })),
  addNote: (folder = "Ideas") => {
    const id = crypto.randomUUID();
    set((state) => ({ notes: [{ id, title: "New note", subtitle: "", text: "", updated: Date.now(), pinned: false, folder, tags: [] }, ...state.notes], selectedId: id }));
  },
  deleteNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id), selectedId: state.notes.find((note) => note.id !== id)?.id || "" })),
  selectNote: (selectedId) => set({ selectedId }),
  selectFolder: (selectedFolder) => set({ selectedFolder }),
  setTheme: (theme) => set({ theme }),
  setAccent: (accent) => set({ accent }),
}), {
  name: "apple-notes-zustand",
  version: 3,
  migrate: (persistedState, version) => {
    const state = persistedState as NotesState;
    return { ...state, accent: version < 3 ? "orange" : state.accent };
  },
}));
