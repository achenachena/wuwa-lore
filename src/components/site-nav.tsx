import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";
import { navRoutes } from "@/lib/site-routes";

type Props = {
  labels: Messages["nav"];
};

export function SiteNav({ labels }: Props) {
  return (
    <nav className="flex flex-wrap gap-4 text-sm">
      {navRoutes().map((route) => (
        <Link
          key={route.path}
          href={route.path}
          className="py-1 text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
        >
          {labels[route.navKey]}
        </Link>
      ))}
    </nav>
  );
}
