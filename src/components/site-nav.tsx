import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";

type Props = {
  labels: Messages["nav"];
};

export function SiteNav({ labels }: Props) {
  const links = [
    { href: "/", label: labels.home },
    { href: "/characters", label: labels.characters },
    { href: "/stats/versions", label: labels.versionStats },
    { href: "/stats/version-halves", label: labels.storySegments },
    { href: "/tools", label: labels.tools },
    { href: "/methodology", label: labels.methodology },
  ];

  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
