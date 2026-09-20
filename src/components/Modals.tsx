export function Modals({
  folderDialog,
  setFolderDialog,
  newFolderName,
  setNewFolderName,
  createFolder,
  renameDialog,
  setRenameDialog,
  renameFolderName,
  setRenameFolderName,
  saveFolderRename,
  confirmDelete,
  setConfirmDelete,
  confirmDeletion,
}: {
  folderDialog: boolean;
  setFolderDialog: (value: boolean) => void;
  newFolderName: string;
  setNewFolderName: (value: string) => void;
  createFolder: () => void;
  renameDialog: { id: string; name: string } | null;
  setRenameDialog: (value: { id: string; name: string } | null) => void;
  renameFolderName: string;
  setRenameFolderName: (value: string) => void;
  saveFolderRename: () => void;
  confirmDelete: { type: "note" | "folder"; id: string; name: string } | null;
  setConfirmDelete: (
    value: { type: "note" | "folder"; id: string; name: string } | null,
  ) => void;
  confirmDeletion: () => void;
}) {
  if (!folderDialog && !renameDialog && !confirmDelete) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
      onMouseDown={() => {
        setFolderDialog(false);
        setRenameDialog(null);
        setConfirmDelete(null);
      }}
    >
      {folderDialog && (
        <form
          className="w-full max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-5 shadow-2xl"
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
          className="w-full max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-5 shadow-2xl"
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
          className="w-full max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-5 shadow-2xl"
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
  );
}
