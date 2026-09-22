import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Accent =
  | "orange"
  | "yellow"
  | "red"
  | "pink"
  | "purple"
  | "blue"
  | "cyan"
  | "green"
  | "white";
export type Font = "sf-display" | "anthropic-serif";
export type Note = {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  updated: number;
  pinned: boolean;
  folder: string;
  tags: string[];
  fileName?: string;
};
export type Folder = {
  id: string;
  name: string;
  icon: string;
  pinned?: boolean;
};

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
  font: Font;
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
  setFont: (font: Font) => void;
  importBatch: (
    importedFolders: string[],
    importedNotes: Array<{
      title: string;
      subtitle?: string;
      text: string;
      folder: string;
    }>,
  ) => void;
  syncFromDisk: (
    diskFolders: string[],
    diskNotes: Array<{
      title: string;
      subtitle?: string;
      text: string;
      folder: string;
      fileName?: string;
      lastModified?: number;
    }>,
  ) => void;
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      folders,
      selectedId: "",
      selectedFolder: "all",
      theme: "system",
      accent: "orange",
      font: "sf-display",
      updateNote: (id, patch) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...patch, updated: Date.now() } : note,
          ),
        })),
      addNote: (folder = "Ideas") => {
        const id = crypto.randomUUID();
        set((state) => ({
          notes: [
            {
              id,
              title: "New note",
              subtitle: "",
              text: "",
              updated: Date.now(),
              pinned: false,
              folder,
              tags: [],
            },
            ...state.notes,
          ],
          selectedId: id,
        }));
      },
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          selectedId: state.notes.find((note) => note.id !== id)?.id || "",
        })),
      addFolder: (name) =>
        set((state) => {
          const cleanName = name.trim();
          if (
            !cleanName ||
            state.folders.some(
              (folder) => folder.name.toLowerCase() === cleanName.toLowerCase(),
            )
          )
            return state;
          return {
            folders:
              state.folders[0]?.id === "all"
                ? [
                    state.folders[0],
                    {
                      id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`,
                      name: cleanName,
                      icon: "folder",
                    },
                    ...state.folders.slice(1),
                  ]
                : [
                    {
                      id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`,
                      name: cleanName,
                      icon: "folder",
                    },
                    ...state.folders,
                  ],
          };
        }),
      toggleFolderPin: (id) =>
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, pinned: !folder.pinned } : folder,
          ),
        })),
      renameFolder: (id, name) =>
        set((state) => {
          const cleanName = name.trim();
          const folder = state.folders.find((item) => item.id === id);
          if (
            !folder ||
            folder.id === "all" ||
            !cleanName ||
            state.folders.some(
              (item) =>
                item.id !== id &&
                item.name.toLowerCase() === cleanName.toLowerCase(),
            )
          )
            return state;
          return {
            folders: state.folders.map((item) =>
              item.id === id ? { ...item, name: cleanName } : item,
            ),
            notes: state.notes.map((note) =>
              note.folder.toLowerCase() === folder.name.toLowerCase()
                ? { ...note, folder: cleanName, updated: Date.now() }
                : note,
            ),
          };
        }),
      deleteFolder: (id) =>
        set((state) => {
          const folder = state.folders.find((item) => item.id === id);
          if (!folder || folder.id === "all") return state;
          const remainingNotes = state.notes.filter(
            (note) => note.folder.toLowerCase() !== folder.name.toLowerCase(),
          );
          return {
            folders: state.folders.filter((item) => item.id !== id),
            notes: remainingNotes,
            selectedFolder:
              state.selectedFolder === id ? "all" : state.selectedFolder,
            selectedId:
              remainingNotes.find((note) => note.id !== state.selectedId)?.id ||
              remainingNotes[0]?.id ||
              "",
          };
        }),
      selectNote: (selectedId) => set({ selectedId }),
      selectFolder: (selectedFolder) => set({ selectedFolder }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      importBatch: (importedFolders, importedNotes) =>
        set((state) => {
          const newFolders = [...state.folders];
          for (const folderName of importedFolders) {
            const cleanName = folderName.trim();
            if (
              cleanName &&
              !newFolders.some(
                (f) => f.name.toLowerCase() === cleanName.toLowerCase(),
              )
            ) {
              const newFolder: Folder = {
                id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`,
                name: cleanName,
                icon: "folder",
              };
              if (newFolders[0]?.id === "all") {
                newFolders.splice(1, 0, newFolder);
              } else {
                newFolders.unshift(newFolder);
              }
            }
          }

          const newNotesList: Note[] = importedNotes.map((n) => ({
            id: crypto.randomUUID(),
            title: n.title || "Untitled note",
            subtitle: n.subtitle || "",
            text: n.text || "",
            updated: Date.now(),
            pinned: false,
            folder: n.folder || "Ideas",
            tags: [],
          }));

          const updatedNotes = [...newNotesList, ...state.notes];
          const newSelectedId = newNotesList[0]?.id || state.selectedId;

          return {
            folders: newFolders,
            notes: updatedNotes,
            selectedId: newSelectedId,
          };
        }),
      syncFromDisk: (diskFolders, diskNotes) =>
        set((state) => {
          const newFolders = [...state.folders];
          for (const folderName of diskFolders) {
            const cleanName = folderName.trim();
            if (
              cleanName &&
              !newFolders.some(
                (f) => f.name.toLowerCase() === cleanName.toLowerCase(),
              )
            ) {
              const newFolder: Folder = {
                id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`,
                name: cleanName,
                icon: "folder",
              };
              if (newFolders[0]?.id === "all") {
                newFolders.splice(1, 0, newFolder);
              } else {
                newFolders.unshift(newFolder);
              }
            }
          }

          const currentNotes = [...state.notes];
          const addedNotes: Note[] = [];
          let hasStateChanges = false;

          for (const diskNote of diskNotes) {
            const diskTitle = (diskNote.title || "Untitled note").trim();
            const diskFolder = (diskNote.folder || "Ideas").trim();

            const existingIndex = currentNotes.findIndex(
              (n) =>
                (diskNote.fileName &&
                  n.fileName === diskNote.fileName &&
                  n.folder.trim().toLowerCase() === diskFolder.toLowerCase()) ||
                (n.title.trim().toLowerCase() === diskTitle.toLowerCase() &&
                  n.folder.trim().toLowerCase() === diskFolder.toLowerCase()),
            );

            if (existingIndex >= 0) {
              const existingNote = currentNotes[existingIndex];
              const isTitleChanged = diskTitle !== existingNote.title.trim();
              const isSubtitleChanged =
                (diskNote.subtitle || "") !== (existingNote.subtitle || "");
              const isTextChanged =
                !!diskNote.text && diskNote.text !== existingNote.text;

              if (isTitleChanged || isSubtitleChanged || isTextChanged) {
                hasStateChanges = true;
                currentNotes[existingIndex] = {
                  ...existingNote,
                  title: isTitleChanged ? diskTitle : existingNote.title,
                  subtitle: diskNote.subtitle || existingNote.subtitle,
                  text: diskNote.text || existingNote.text,
                  updated: diskNote.lastModified || Date.now(),
                  fileName: diskNote.fileName || existingNote.fileName,
                };
              }
            } else {
              hasStateChanges = true;
              addedNotes.push({
                id: crypto.randomUUID(),
                title: diskTitle,
                subtitle: diskNote.subtitle || "",
                text: diskNote.text || "",
                updated: diskNote.lastModified || Date.now(),
                pinned: false,
                folder: diskFolder,
                tags: [],
                fileName: diskNote.fileName,
              });
            }
          }

          if (!hasStateChanges && newFolders.length === state.folders.length) {
            return state;
          }

          const mergedNotes = [...addedNotes, ...currentNotes];
          const newSelectedId =
            state.selectedId &&
            mergedNotes.some((n) => n.id === state.selectedId)
              ? state.selectedId
              : mergedNotes[0]?.id || "";

          return {
            folders: newFolders,
            notes: mergedNotes,
            selectedId: newSelectedId,
          };
        }),
      setFont: (font) => set({ font }),
    }),
    {
      name: "apple-notes-zustand",
      version: 5,
      migrate: (persistedState, version) => {
        const state = persistedState as NotesState;
        return {
          ...state,
          accent: version < 3 ? "orange" : state.accent,
          font: state.font || "sf-display",
          folders: state.folders.filter((folder) => folder.id !== "deleted"),
          selectedFolder:
            state.selectedFolder === "deleted" ? "all" : state.selectedFolder,
        };
      },
    },
  ),
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "apple-notes-zustand") {
      useNotesStore.persist.rehydrate();
    }
  });

  useNotesStore.subscribe((state, prevState) => {
    if (
      state.notes !== prevState.notes ||
      state.folders !== prevState.folders
    ) {
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const channel = new BroadcastChannel("apple-notes-channel");
          channel.postMessage("sync-notes");
          channel.close();
        } catch {}
      }
    }
  });
}
