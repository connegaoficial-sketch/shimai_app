import type { Metadata } from "next";

/**
 * Public customer shell — presentational only.
 */
export const metadata: Metadata = {
  manifest: "/manifest-client.json",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-shimai-black text-shimai-ivory">
      {children}
    </div>
  );
}
