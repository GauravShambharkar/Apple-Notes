import { useEffect, useRef, useState } from "react";

export function useCaretSync(
  titleRef: React.RefObject<HTMLHeadingElement | null>,
  editorRef: React.RefObject<HTMLDivElement | null>,
  subtitleRef?: React.RefObject<HTMLDivElement | null>,
) {
  const [caretBar, setCaretBar] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);

  const [commandMenu, setCommandMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [selectionMenu, setSelectionMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [slashMode, setSlashMode] = useState(false);
  const savedSelection = useRef<Range | null>(null);

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
  }, [editorRef]);

  useEffect(() => {
    const syncCaret = () => {
      const selection = window.getSelection();
      if (!selection || !selection.isCollapsed || !selection.anchorNode) {
        setCaretBar(null);
        return;
      }
      const inTitle = !!titleRef.current?.contains(selection.anchorNode);
      const inSubtitle = !!subtitleRef?.current?.contains(selection.anchorNode);
      const inBody = !!editorRef.current?.contains(selection.anchorNode);
      if (!inTitle && !inSubtitle && !inBody) {
        setCaretBar(null);
        return;
      }
      const host = inTitle
        ? titleRef.current
        : inSubtitle
          ? (subtitleRef ? subtitleRef.current : null)
          : editorRef.current;
      const range = selection.getRangeAt(0);

      let top = 0;
      let left = 0;
      let height = 24;
      let measured = false;

      const rects = range.getClientRects();
      if (rects.length > 0) {
        const rangeRect = rects[0];
        if (rangeRect && rangeRect.top > 0) {
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
  }, [editorRef, titleRef, subtitleRef]);

  const restoreSelection = () => {
    if (!savedSelection.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedSelection.current);
  };

  return {
    caretBar,
    commandMenu,
    setCommandMenu,
    selectionMenu,
    setSelectionMenu,
    slashMode,
    setSlashMode,
    savedSelection,
    restoreSelection,
  };
}
