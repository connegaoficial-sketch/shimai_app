import Link from "next/link";

import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { shimaiBrand } from "@/lib/brand/shimai";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.05] bg-shimai-black">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6">
        <Link href="/" className="block h-16 w-16 transition-opacity hover:opacity-80">
          <ShimaiLogo variant="emblem" className="h-16 w-16" />
        </Link>

        <div className="space-y-1">
          <p className="font-serif text-lg tracking-wide text-shimai-ivory">
            {shimaiBrand.name}
          </p>
          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-shimai-gold/70">
            {shimaiBrand.tagline}
          </p>
        </div>

        <p className="max-w-sm font-sans text-xs leading-relaxed text-shimai-ivory/40">
          {shimaiBrand.motto}
        </p>
      </div>
    </footer>
  );
}
