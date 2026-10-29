import type { ReactNode } from "react";
import { adminPwaMetadata, adminPwaViewport } from "@/lib/pwa/metadata";

export const metadata = adminPwaMetadata;
export const viewport = adminPwaViewport;

/**
 * Route-group shell for the admin segment.
 * Panel chrome lives in `admin/(panel)/layout.tsx`.
 */
export default function AdminGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
