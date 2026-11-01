"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors",
        active ? "bg-white/12 font-medium text-white" : "text-white/70 hover:bg-white/6 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}
