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
      const menuWidth = 340;
      const menuHeight = 44;
      let top = rect.bottom + 8;
      let left = rect.left;

      if (top + menuHeight > window.innerHeight - 16) {
        top = Math.max(16, rect.top - menuHeight - 8);
      }
      if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - menuWidth - 16;
      }
      left = Math.max(16, left);

      setCommandMenu(null);
      setSlashMode(false);
      setSelectionMenu({ top, left });
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

      const anchorNode = selection.anchorNode;
      const anchorElem = (
        anchorNode.nodeType === Node.ELEMENT_NODE
          ? anchorNode
          : anchorNode.parentElement
      ) as HTMLElement | null;

      if (!anchorElem) {
        setCaretBar(null);
        return;
      }

      const style = window.getComputedStyle(anchorElem);
      const fontSize = parseFloat(style.fontSize) || 16;
      
      const targetCaretHeight = inTitle
        ? 38
        : inSubtitle
          ? 22
          : Math.min(Math.max(Math.round(fontSize * 1.2), 18), 34);

      const minCaretHeight = inTitle ? 30 : inSubtitle ? 18 : 16;
      const maxCaretHeight = inTitle ? 44 : inSubtitle ? 26 : 36;

      let top = 0;
      let left = 0;
      let height = targetCaretHeight;
      let measured = false;

      // 1. Try precise character measurement on text nodes using cloned sub-range
      if (anchorNode.nodeType === Node.TEXT_NODE && anchorNode.nodeValue) {
        const textVal = anchorNode.nodeValue;
        const offset = selection.anchorOffset;
        const subRange = document.createRange();

        if (offset > 0) {
          subRange.setStart(anchorNode, offset - 1);
          subRange.setEnd(anchorNode, offset);
          const r = subRange.getBoundingClientRect();
          if (r && r.height > 0 && r.top > 0) {
            top = r.top;
            left = r.right;
            height = r.height;
            measured = true;
          }
        } else if (textVal.length > 0) {
          subRange.setStart(anchorNode, 0);
          subRange.setEnd(anchorNode, 1);
          const r = subRange.getBoundingClientRect();
          if (r && r.height > 0 && r.top > 0) {
            top = r.top;
            left = r.left;
            height = r.height;
            measured = true;
          }
        }
      }

      // 2. Fallback to range.getClientRects() if single character measurement wasn't possible
      if (!measured) {
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
      }

      // 3. Fallback for empty block elements/containers
      if (!measured) {
        const r = anchorElem.getBoundingClientRect();
        if (r && r.top > 0) {
          const paddingTop = parseFloat(style.paddingTop) || 0;
          const paddingLeft = parseFloat(style.paddingLeft) || 0;
          const borderTop = parseFloat(style.borderTopWidth) || 0;
          const borderLeft = parseFloat(style.borderLeftWidth) || 0;

          top = r.top + paddingTop + borderTop;
          left = r.left + paddingLeft + borderLeft;
          measured = true;
        }
      }

      if (!measured && host) {
        const fallback = host.getBoundingClientRect();
        top = fallback.top;
        left = fallback.left;
      }

      // Strictly bound caret height to current field font dimensions
      const finalHeight =
        measured && height >= minCaretHeight && height <= maxCaretHeight
          ? Math.round(height)
          : targetCaretHeight;

      setCaretBar({ top, left, height: finalHeight });
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
