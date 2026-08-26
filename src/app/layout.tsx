import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { PwaUpdateToast } from "@/components/public/PwaUpdateToast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SHIMAI SUSHI",
    template: "%s · SHIMAI SUSHI",
  },
  description:
    "SHIMAI SUSHI HOUSE — ¿Qué se te antoja? Si no sabes, ve por lo que más piden. Entrega en Rioverde, Ciudad Fernández y El Refugio. Horario 10 am–10 pm.",
  applicationName: "SHIMAI SUSHI",
  manifest: "/manifest-client.json",
  icons: {
    icon: [
      { url: "/icon-32x32.ico", sizes: "32x32" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192x192.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "SHIMAI SUSHI HOUSE",
    description:
      "¿Qué se te antoja? Si no sabes, ve por lo que más piden. Pedido online con entrega en Rioverde y alrededores.",
    images: [{ url: "/logo_shimai.jpeg", width: 1200, height: 1200, alt: "SHIMAI SUSHI HOUSE" }],
    locale: "es_MX",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SHIMAI SUSHI",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#080808",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${playfair.variable} h-full overflow-x-clip antialiased`}
    >
      <body className="flex min-h-dvh flex-col overflow-x-clip bg-shimai-black font-sans text-shimai-ivory touch-manipulation">
        {children}
        <PwaUpdateToast />
      </body>
    </html>
  );
}
