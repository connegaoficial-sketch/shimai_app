"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function DriverShell({
  driverName,
  children,
}: {
  driverName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/driver/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-shimai-black text-shimai-ivory">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-shimai-black/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link href="/driver" className="min-w-0">
            <p className="font-serif text-xl text-shimai-ivory">SHIMAI</p>
            <p className="truncate font-sans text-[10px] uppercase tracking-[0.16em] text-shimai-gold/80">
              {driverName}
            </p>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 px-3 text-xs"
            onClick={() => void signOut()}
          >
            Salir
          </Button>
        </div>
        <nav className="mx-auto mt-3 flex max-w-lg gap-2">
          <Link
            href="/driver"
            className={cn(
              "flex h-12 flex-1 items-center justify-center rounded-md font-sans text-sm font-medium",
              pathname === "/driver"
                ? "bg-shimai-gold text-shimai-black"
                : "border border-shimai-gold/30 text-shimai-ivory",
            )}
          >
            Pedidos
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
