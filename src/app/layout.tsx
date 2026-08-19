import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";

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
    "SHIMAI SUSHI HOUSE — Por hermanas, una historia, un sabor. Dark kitchen premium con entrega a domicilio.",
  applicationName: "SHIMAI SUSHI",
  manifest: "/manifest.json",
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
      "Dos hermanas. Un menú. Intensidad de Ane, frescura de Imōto, y lo que crean juntas.",
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
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-shimai-black font-sans text-shimai-ivory">
        {children}
      </body>
    </html>
  );
}
