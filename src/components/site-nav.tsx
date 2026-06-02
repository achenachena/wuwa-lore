import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Characters" },
  { href: "/stats/versions", label: "Version Stats" },
  { href: "/tools", label: "Tools" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteNav() {
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
