import { useState } from "react";
import {
  LuBold,
  LuCheck,
  LuChevronDown,
  LuList,
  LuListOrdered,
  LuPalette,
  LuUnderline,
} from "react-icons/lu";

export function CommandMenu({
  position,
  onList,
  onBlock,
  onCommand,
  onColor,
}: {
  position: { top: number; left: number };
  onList: (type: "bullet" | "number" | "alphabet" | "check") => void;
  onBlock: (tag: "h1" | "h4" | "p") => void;
  onCommand: (name: string, value?: string) => void;
  onColor: (color: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  return (
    <div
      className="command-menu fixed z-40 flex w-fit max-w-[92vw] flex-wrap items-center gap-1 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-2 shadow-2xl"
      style={position}
    >
      <button
        className="rounded-lg p-2 hover:bg-black/[.06]"
        onClick={() => onCommand("bold")}
        title="Bold"
      >
        <LuBold />
      </button>
      <button
        className="rounded-lg p-2 hover:bg-black/[.06]"
        onClick={() => onCommand("underline")}
        title="Underline"
      >
        <LuUnderline />
      </button>

      <button
        className="rounded-lg p-2 hover:bg-black/[.06] text-xs font-bold"
        onClick={() => onBlock("h1")}
        title="Title (H1)"
      >
        H1
      </button>

      <button
        className="rounded-lg p-2 hover:bg-black/[.06] text-xs font-bold"
        onClick={() => onBlock("h4")}
        title="Heading (H4)"
      >
        H4
      </button>

      <button
        className="rounded-lg p-2 hover:bg-black/[.06]"
        onClick={() => onList("bullet")}
        title="Bullet list"
      >
        <LuList />
      </button>

      <button
        className="rounded-lg p-2 hover:bg-black/[.06]"
        onClick={() => onList("number")}
        title="Numbered list"
      >
        <LuListOrdered />
      </button>

      <button
        className="rounded-lg p-2 hover:bg-black/[.06] text-xs font-semibold px-2"
        onClick={() => onList("alphabet")}
        title="Alphabet list (a. b. c.)"
      >
        a.b.c
      </button>

      <button
        className="rounded-lg p-2 hover:bg-black/[.06]"
        onClick={() => onList("check")}
        title="Checklist"
      >
        <LuCheck />
      </button>

      <div className="relative">
        <button
          className="flex items-center gap-1 rounded-lg p-2 hover:bg-black/[.06]"
          onClick={() => setShowColors(!showColors)}
          title="Color"
        >
          <LuPalette />
          <LuChevronDown />
        </button>

        {showColors && (
          <div className="absolute right-0 top-10 flex gap-1 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-2 shadow-xl">
            {["#ff9f0a", "#ff453a", "#0a84ff", "#30d158", "#ffffff"].map(
              (c) => (
                <button
                  key={c}
                  className="h-5 w-5 rounded-full border border-black/20"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    onColor(c);
                    setShowColors(false);
                  }}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
