import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminProfile } from "@/lib/admin/get-admin-profile";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const profile = await getAdminProfile();
  if (!profile) {
    redirect("/admin/login");
  }

  const sisterName = profile.full_name?.trim() || "Hermana";

  return (
    <div className="flex h-dvh overflow-hidden bg-shimai-black text-shimai-ivory">
      <div className="hidden md:block">
        <AdminSidebar sisterName={sisterName} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader sisterName={sisterName} />
        <div className="border-b border-white/[0.06] px-3 py-2 md:hidden">
          <AdminMobileNav />
        </div>
        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
