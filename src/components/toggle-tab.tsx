import type { ReactNode } from "react";

type Props = {
  active: boolean;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
};

const baseClass = "rounded-md px-3 py-2 text-sm";
const activeClass = "bg-zinc-900 text-white";
const inactiveClass = "border border-zinc-300 bg-white";

export function ToggleTab({ active, onClick, href, children }: Props) {
  const className = `${baseClass} ${active ? activeClass : inactiveClass}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export function toggleTabClassName(active: boolean): string {
  return `${baseClass} ${active ? activeClass : inactiveClass}`;
}
