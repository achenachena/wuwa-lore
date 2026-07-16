import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";
import { navRoutes } from "@/lib/site-routes";

type Props = {
  labels: Messages["nav"];
};

export function SiteNav({ labels }: Props) {
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {navRoutes().map((route) => (
        <Link
          key={route.path}
          href={route.path}
          className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100"
        >
          {labels[route.navKey]}
        </Link>
      ))}
    </nav>
  );
}
