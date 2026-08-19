"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/menu", label: "Menú" },
  { href: "/admin/team", label: "Equipo" },
  { href: "/admin/settings", label: "Configuración" },
] as const;

type AdminSidebarProps = {
  sisterName: string;
};

export function AdminSidebar({ sisterName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-white/[0.08] bg-shimai-black">
      <div className="border-b border-white/[0.08] px-4 py-5">
        <Link href="/admin/orders" className="block">
          <p className="font-serif text-xl tracking-wide text-shimai-ivory">
            SHIMAI
          </p>
          <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.2em] text-shimai-gold/80">
            Admin
          </p>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2.5 font-sans text-sm transition-colors",
                active
                  ? "bg-shimai-gold/15 text-shimai-gold"
                  : "text-shimai-ivory/70 hover:bg-white/[0.04] hover:text-shimai-ivory",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] px-4 py-4">
        <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-shimai-ivory/40">
          Sesión
        </p>
        <p className="mt-1 truncate font-sans text-sm text-shimai-ivory">
          {sisterName}
        </p>
      </div>
    </aside>
  );
}
