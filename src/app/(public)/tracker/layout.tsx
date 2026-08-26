import type { ReactNode } from "react";

import { trackerPwaMetadata } from "@/lib/pwa/metadata";

export const metadata = trackerPwaMetadata;

export default function TrackerLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
