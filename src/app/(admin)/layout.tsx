import type { ReactNode } from "react";

/**
 * Route-group shell for the admin segment.
 * Panel chrome lives in `admin/(panel)/layout.tsx`.
 */
export default function AdminGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
