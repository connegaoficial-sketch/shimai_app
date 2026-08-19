"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/menu", label: "Menú" },
  { href: "/admin/settings", label: "Config" },
] as const;

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 font-sans text-xs uppercase tracking-[0.12em] transition-colors",
              active
                ? "bg-shimai-gold/15 text-shimai-gold"
                : "text-shimai-ivory/60 hover:text-shimai-ivory",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
