import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Accent = "orange" | "yellow" | "red" | "pink" | "purple" | "blue" | "cyan" | "green" | "white";
export type Note = { id: string; title: string; subtitle: string; text: string; updated: number; pinned: boolean; folder: string; tags: string[] };
export type Folder = { id: string; name: string; icon: string; pinned?: boolean };

const folders: Folder[] = [
  { id: "all", name: "All Notes", icon: "notes" },
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
  addFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  toggleFolderPin: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
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
  addFolder: (name) => set((state) => {
    const cleanName = name.trim();
    if (!cleanName || state.folders.some((folder) => folder.name.toLowerCase() === cleanName.toLowerCase())) return state;
    return { folders: state.folders[0]?.id === "all" ? [state.folders[0], { id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`, name: cleanName, icon: "folder" }, ...state.folders.slice(1)] : [{ id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`, name: cleanName, icon: "folder" }, ...state.folders] };
  }),
  toggleFolderPin: (id) => set((state) => ({ folders: state.folders.map((folder) => folder.id === id ? { ...folder, pinned: !folder.pinned } : folder) })),
  renameFolder: (id, name) => set((state) => {
    const cleanName = name.trim();
    const folder = state.folders.find((item) => item.id === id);
    if (!folder || folder.id === "all" || !cleanName || state.folders.some((item) => item.id !== id && item.name.toLowerCase() === cleanName.toLowerCase())) return state;
    return { folders: state.folders.map((item) => item.id === id ? { ...item, name: cleanName } : item), notes: state.notes.map((note) => note.folder.toLowerCase() === folder.name.toLowerCase() ? { ...note, folder: cleanName, updated: Date.now() } : note) };
  }),
  deleteFolder: (id) => set((state) => {
    const folder = state.folders.find((item) => item.id === id);
    if (!folder || folder.id === "all") return state;
    const remainingNotes = state.notes.filter((note) => note.folder.toLowerCase() !== folder.name.toLowerCase());
    return { folders: state.folders.filter((item) => item.id !== id), notes: remainingNotes, selectedFolder: state.selectedFolder === id ? "all" : state.selectedFolder, selectedId: remainingNotes.find((note) => note.id !== state.selectedId)?.id || remainingNotes[0]?.id || "" };
  }),
  selectNote: (selectedId) => set({ selectedId }),
  selectFolder: (selectedFolder) => set({ selectedFolder }),
  setTheme: (theme) => set({ theme }),
  setAccent: (accent) => set({ accent }),
}), {
  name: "apple-notes-zustand",
  version: 4,
  migrate: (persistedState, version) => {
    const state = persistedState as NotesState;
    return {
      ...state,
      accent: version < 3 ? "orange" : state.accent,
      folders: state.folders.filter((folder) => folder.id !== "deleted"),
      selectedFolder: state.selectedFolder === "deleted" ? "all" : state.selectedFolder,
    };
  },
}));
