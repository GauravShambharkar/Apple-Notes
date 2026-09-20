import type { ReactNode } from "react";

export function IconButton({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      className={`icon-button grid h-8 w-8 place-items-center rounded-lg bg-transparent text-[var(--text-secondary)] transition-colors hover:bg-black/[.06] hover:text-[var(--text-primary)] ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
