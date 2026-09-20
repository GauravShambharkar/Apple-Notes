import { useEffect, useRef } from "react";
import type { FormEvent } from "react";
import {
  LuChevronDown,
  LuCloud,
  LuCloudOff,
  LuPin,
  LuShare2,
  LuTrash2,
} from "react-icons/lu";
import type { Accent, Note, Theme } from "@/store/useNotesStore";
import { dateLabel } from "@/lib/fileExportUtils";
import { IconButton } from "@/components/IconButton";
import { ThemeMenu } from "@/components/ThemeMenu";
import { CommandMenu } from "@/components/CommandMenu";

export function EditorPane({
  selected,
  mobileEditor,
  setMobileEditor,
  autoSave,
  toggleAutoSave,
  theme,
  accent,
  setTheme,
  setAccent,
  updateSelected,
  setConfirmDelete,
  titleRef,
  subtitleRef,
  editorRef,
  caretBar,
  commandMenu,
  setCommandMenu,
  selectionMenu,
  setSelectionMenu,
  slashMode,
  setSlashMode,
  savedSelection,
  restoreSelection,
}: {
  selected: Note | null;
  mobileEditor: boolean;
  setMobileEditor: (value: boolean) => void;
  autoSave: boolean;
  toggleAutoSave: () => void;
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  updateSelected: (patch: Partial<Note>) => void;
  setConfirmDelete: (
    value: { type: "note" | "folder"; id: string; name: string } | null,
  ) => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  subtitleRef?: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<HTMLDivElement | null>;
  caretBar: { top: number; left: number; height: number } | null;
  commandMenu: { top: number; left: number } | null;
  setCommandMenu: (value: { top: number; left: number } | null) => void;
  selectionMenu: { top: number; left: number } | null;
  setSelectionMenu: (value: { top: number; left: number } | null) => void;
  slashMode: boolean;
  setSlashMode: (value: boolean) => void;
  savedSelection: React.RefObject<Range | null>;
  restoreSelection: () => void;
}) {
  const selectedId = selected?.id;

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (selected) {
      if (editorRef.current) editorRef.current.innerHTML = selected.text;
      if (titleRef.current) titleRef.current.textContent = selected.title;
      if (subtitleRef?.current)
        subtitleRef.current.textContent = selected.subtitle || "";
    } else {
      if (editorRef.current) editorRef.current.innerHTML = "";
      if (titleRef.current) titleRef.current.textContent = "";
      if (subtitleRef?.current) subtitleRef.current.textContent = "";
    }
  }, [selectedId]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
        const rawText = (
          (span ? span.textContent : liElement.textContent) ?? ""
        ).replace(/[\u200b\s]/g, "");

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
      <div
        ref={subtitleRef}
        className="editor-subtitle my-[8px] block min-h-[28px] w-full border-0 bg-transparent text-lg font-medium leading-normal text-[var(--text-secondary)] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Note subtitle"
        data-placeholder="Subtitle"
        onInput={(e) =>
          updateSelected({ subtitle: e.currentTarget.textContent || "" })
        }
      />
      <div
        ref={editorRef}
        className="editor-body outline-none"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Note body"
        data-placeholder="Start typing..."
        onInput={onInput}
        onKeyDown={onEditorKeyDown}
      />
    </>
  ) : (
    <div className="editor-empty flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
      No note selected
    </div>
  );

  return (
    <section
      className={`editor-pane relative flex flex-1 w-full min-w-0 h-screen flex-col overflow-hidden bg-[var(--editor)] max-[767px]:fixed max-[767px]:inset-0 max-[767px]:z-40 max-[767px]:hidden ${mobileEditor ? "mobile-visible max-[767px]:block" : ""}`}
    >
      <header className="top-toolbar flex h-[var(--toolbar-height)] w-full shrink-0 items-center justify-between border-b border-[var(--separator)] px-7 max-[767px]:px-5">
        <div className="toolbar-left flex items-center gap-1">
          {mobileEditor && (
            <button
              className="mobile-back flex items-center gap-1 bg-transparent text-sm text-[var(--accent)]"
              onClick={() => setMobileEditor(false)}
            >
              <LuChevronDown /> Notes
            </button>
          )}
        </div>
        <div className="toolbar-right relative flex items-center gap-1">
          <p className="text-[16px] text-black dark:text-white/30 flex items-center w-fit">
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
        <article className="editor-document min-h-full w-full max-w-[840px] px-7 pb-24 pt-11 max-[767px]:px-5 max-[767px]:pt-7">
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
    </section>
  );
}
