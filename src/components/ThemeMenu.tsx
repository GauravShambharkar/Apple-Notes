import { useState } from "react";
import {
  LuCheck,
  LuChevronDown,
  LuMonitor,
  LuMoon,
  LuSun,
} from "react-icons/lu";
import type { Accent, Theme } from "@/store/useNotesStore";

const accents: { name: Accent; color: string }[] = [
  { name: "orange", color: "#ff9f0a" },
  { name: "yellow", color: "#ffd60a" },
  { name: "red", color: "#ff453a" },
  { name: "pink", color: "#ff375f" },
  { name: "purple", color: "#bf5af2" },
  { name: "blue", color: "#0a84ff" },
  { name: "cyan", color: "#64d2ff" },
  { name: "green", color: "#30d158" },
  { name: "white", color: "#ffffff" },
];

export function ThemeMenu({
  theme,
  accent,
  setTheme,
  setAccent,
}: {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="appearance-control relative">
      <button
        className="appearance-button flex h-8 items-center gap-1 rounded-lg bg-transparent px-2 text-xs text-[var(--text-secondary)] transition-colors hover:bg-black/[.06]"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="appearance-icon text-[var(--accent)]">
          {theme === "dark" ? (
            <LuMoon />
          ) : theme === "system" ? (
            <LuMonitor />
          ) : (
            <LuSun />
          )}
        </span>
        <span>
          {theme === "system"
            ? "System"
            : theme[0].toUpperCase() + theme.slice(1)}
        </span>
        <LuChevronDown />
      </button>
      {open && (
        <div className="appearance-menu absolute right-0 top-10 z-20 w-44 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-2 shadow-xl">
          <p className="m-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
            Appearance
          </p>
          {(["light", "dark", "system"] as Theme[]).map((item) => (
            <button
              key={item}
              className={`flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs ${theme === item ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" : "hover:bg-black/[.06]"}`}
              onClick={() => {
                setTheme(item);
                setOpen(false);
              }}
            >
              {item === "light" ? (
                <LuSun />
              ) : item === "dark" ? (
                <LuMoon />
              ) : (
                <LuMonitor />
              )}{" "}
              <span>{item[0].toUpperCase() + item.slice(1)}</span>
              {theme === item && <LuCheck />}
            </button>
          ))}
          <p className="m-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
            Accent color
          </p>
          <div className="accent-grid flex w-full flex-wrap gap-2 p-2">
            {accents.map((item) => (
              <button
                key={item.name}
                aria-label={`${item.name} accent`}
                className={`h-4 w-4 shrink-0 rounded-full border-2 border-[var(--surface)] bg-[var(--swatch)] ${accent === item.name ? "ring-2 ring-[var(--accent)]" : "ring-1 ring-[var(--separator)]"}`}
                style={{ "--swatch": item.color } as React.CSSProperties}
                onClick={() => {
                  setAccent(item.name);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
