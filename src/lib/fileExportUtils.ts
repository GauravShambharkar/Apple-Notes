import type { Note } from "@/store/useNotesStore";

export type ExportFile = {
  createWritable: () => Promise<{
    write: (content: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export type ExportDirectory = {
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

export type ExportManifest = {
  files: Record<string, string>;
  folders: string[];
};

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<div><br><\/div>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n\n+/g, "\n\n")
    .trim();
}

export function parseImportedContent(filename: string, rawText: string) {
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
    const titleIndex = lines.indexOf(nonEmpty[0]);
    bodyLines = lines.slice(titleIndex + 1);
    const bodyNonEmpty = bodyLines.filter((l) => l.length > 0);
    if (bodyNonEmpty.length > 0) {
      subtitle = bodyNonEmpty[0].replace(/^#+\s*/, "");
    }
  }

  const htmlText = bodyLines
    .map((line) => (line ? `<p>${line}</p>` : "<p><br></p>"))
    .join("");

  return {
    title: title || baseName,
    subtitle,
    text: htmlText,
  };
}

export function dateLabel(date: number) {
  const day = new Date(date);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return "Today";
  return day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function plain(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function safeFileName(value: string, fallback: string) {
  return (value.trim() || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

export async function getDirectoryEntries(
  dirHandle: any,
): Promise<Array<[string, any]>> {
  const entries: Array<[string, any]> = [];
  if (!dirHandle) return entries;

  try {
    if (typeof dirHandle.entries === "function") {
      for await (const [name, handle] of dirHandle.entries()) {
        entries.push([name, handle]);
      }
      return entries;
    }
  } catch {}

  try {
    if (typeof dirHandle[Symbol.asyncIterator] === "function") {
      for await (const entry of dirHandle) {
        if (Array.isArray(entry)) {
          entries.push([entry[0], entry[1]]);
        } else if (entry && entry.name) {
          entries.push([entry.name, entry]);
        }
      }
      return entries;
    }
  } catch {}

  try {
    if (typeof dirHandle.values === "function") {
      for await (const handle of dirHandle.values()) {
        if (handle && handle.name) {
          entries.push([handle.name, handle]);
        }
      }
      return entries;
    }
  } catch {}

  return entries;
}

export function getDeletedManifest(): Set<string> {
  try {
    const raw = localStorage.getItem("apple-notes-deleted-manifest");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addDeletedManifest(key: string) {
  try {
    const set = getDeletedManifest();
    set.add(key.toLowerCase());
    localStorage.setItem(
      "apple-notes-deleted-manifest",
      JSON.stringify([...set]),
    );
  } catch {}
}

export async function removeNoteFileFromDisk(
  root: ExportDirectory,
  folderName: string,
  fileName?: string,
  title?: string,
) {
  if (!root) return;

  const targetFolder = safeFileName(folderName, "Unfiled").toLowerCase();
  const cleanTitle = safeFileName(title || "", "").toLowerCase();
  const cleanFileName = (fileName || "").toLowerCase();

  if (cleanFileName) addDeletedManifest(cleanFileName);
  if (cleanTitle) addDeletedManifest(`${targetFolder}/${cleanTitle}`);

  try {
    const rootEntries = await getDirectoryEntries(root);
    for (const [name, handle] of rootEntries) {
      if (handle.kind === "directory" && name.toLowerCase() === targetFolder) {
        const subEntries = await getDirectoryEntries(handle);
        for (const [fName, fHandle] of subEntries) {
          if (fHandle.kind === "file") {
            const lowerFName = fName.toLowerCase();
            const baseName = lowerFName.replace(/\.[^/.]+$/, "");
            if (
              (cleanFileName && lowerFName === cleanFileName) ||
              (cleanTitle && baseName === cleanTitle)
            ) {
              try {
                await handle.removeEntry?.(fName);
              } catch {}
            }
          }
        }
      } else if (handle.kind === "file") {
        const lowerName = name.toLowerCase();
        const baseName = lowerName.replace(/\.[^/.]+$/, "");
        if (
          (cleanFileName && lowerName === cleanFileName) ||
          (cleanTitle && baseName === cleanTitle)
        ) {
          try {
            await root.removeEntry?.(name);
          } catch {}
        }
      }
    }
  } catch {}
}

export async function removeFolderFromDisk(
  root: ExportDirectory,
  folderName: string,
) {
  if (!root) return;
  const targetFolder = safeFileName(folderName, "Unfiled").toLowerCase();
  try {
    const rootEntries = await getDirectoryEntries(root);
    for (const [name, handle] of rootEntries) {
      if (handle.kind === "directory" && name.toLowerCase() === targetFolder) {
        try {
          await root.removeEntry?.(name, { recursive: true });
        } catch {}
      }
    }
  } catch {}
}

export async function readNotesFromDirectory(root: ExportDirectory) {
  const diskFolders: string[] = [];
  const diskNotes: Array<{
    title: string;
    subtitle?: string;
    text: string;
    folder: string;
    fileName?: string;
    lastModified?: number;
  }> = [];

  const deletedSet = getDeletedManifest();
  const rootEntries = await getDirectoryEntries(root);

  for (const [name, handle] of rootEntries) {
    if (handle.kind === "directory") {
      diskFolders.push(name);
      const subEntries = await getDirectoryEntries(handle);
      for (const [fileName, fileHandle] of subEntries) {
        if (fileHandle.kind === "file") {
          const lower = fileName.toLowerCase();
          if (
            lower.endsWith(".txt") ||
            lower.endsWith(".md") ||
            lower.endsWith(".json") ||
            lower.endsWith(".html")
          ) {
            try {
              const fileObj = await (
                fileHandle as unknown as FileSystemFileHandle
              ).getFile();
              const rawText = await fileObj.text();
              const parsed = parseImportedContent(fileName, rawText);
              const pathKey = `${name.toLowerCase()}/${parsed.title.toLowerCase()}`;
              if (deletedSet.has(lower) || deletedSet.has(pathKey)) {
                continue;
              }
              diskNotes.push({
                title: parsed.title,
                subtitle: parsed.subtitle,
                text: parsed.text,
                folder: name,
                fileName: fileName,
                lastModified: fileObj.lastModified,
              });
            } catch {}
          }
        }
      }
    } else if (handle.kind === "file") {
      const lower = name.toLowerCase();
      if (
        lower.endsWith(".txt") ||
        lower.endsWith(".md") ||
        lower.endsWith(".json") ||
        lower.endsWith(".html")
      ) {
        try {
          const fileObj = await (
            handle as unknown as FileSystemFileHandle
          ).getFile();
          const rawText = await fileObj.text();
          const parsed = parseImportedContent(name, rawText);
          const pathKey = `ideas/${parsed.title.toLowerCase()}`;
          if (deletedSet.has(lower) || deletedSet.has(pathKey)) {
            continue;
          }
          diskNotes.push({
            title: parsed.title,
            subtitle: parsed.subtitle,
            text: parsed.text,
            folder: "Ideas",
            fileName: name,
            lastModified: fileObj.lastModified,
          });
        } catch {}
      }
    }
  }

  return { diskFolders, diskNotes };
}

export async function writeNotesToDirectory(
  root: ExportDirectory,
  notes: Note[],
) {
  if (!notes || notes.length === 0) {
    return;
  }
  const usedNames = new Map<string, number>();
  const files: Record<string, string> = {};
  const folders = new Set<string>();

  for (const note of notes) {
    const folder = safeFileName(note.folder, "Unfiled");
    let targetFileName = note.fileName;

    if (!targetFileName) {
      const baseName = safeFileName(note.title, "Untitled note");
      const count = usedNames.get(`${folder}/${baseName}`) || 0;
      usedNames.set(`${folder}/${baseName}`, count + 1);
      targetFileName = count
        ? `${baseName} (${count + 1}).txt`
        : `${baseName}.txt`;
      note.fileName = targetFileName;
    }

    const path = `${folder}/${targetFileName}`;
    files[note.id] = path;
    folders.add(folder);

    const titleText = (note.title || "Untitled note").trim();
    const bodyText = htmlToPlainText(note.text);

    let content = titleText;
    if (bodyText) {
      if (bodyText.toLowerCase().startsWith(titleText.toLowerCase())) {
        content = bodyText;
      } else {
        content = `${titleText}\n${bodyText}`;
      }
    }

    try {
      const folderHandle = await root.getDirectoryHandle(folder, {
        create: true,
      });
      const fileHandle = await folderHandle.getFileHandle(targetFileName, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch {}
  }

  localStorage.setItem(
    "apple-notes-export-manifest",
    JSON.stringify({ files, folders: [...folders] } satisfies ExportManifest),
  );
}
