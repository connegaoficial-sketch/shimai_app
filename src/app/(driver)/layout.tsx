import type { ReactNode } from "react";

import {
  driverPwaMetadata,
  driverPwaViewport,
} from "@/lib/pwa/metadata";

export const metadata = driverPwaMetadata;
export const viewport = driverPwaViewport;

export default function DriverGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
