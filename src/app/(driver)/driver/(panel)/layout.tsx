import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DriverShell } from "@/components/driver/DriverShell";
import { getDriverProfile } from "@/lib/driver/get-driver-profile";

export default async function DriverPanelLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const profile = await getDriverProfile();
  if (!profile) {
    redirect("/driver/login");
  }

  const driverName = profile.full_name?.trim() || "Repartidor";

  return <DriverShell driverName={driverName}>{children}</DriverShell>;
}
