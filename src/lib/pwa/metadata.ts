import type { Metadata, Viewport } from "next";

export const driverPwaMetadata: Metadata = {
  title: {
    default: "SHIMAI Repartidor",
    template: "%s · Repartidor",
  },
  description: "App de entregas SHIMAI",
  applicationName: "SHIMAI Repartidor",
  manifest: "/manifest-driver.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SHIMAI Reparto",
  },
};

export const driverPwaViewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
};

export const trackerPwaMetadata: Metadata = {
  title: {
    default: "Mi pedido · SHIMAI",
    template: "%s · SHIMAI",
  },
  description: "Sigue tu pedido SHIMAI en tiempo real",
  applicationName: "SHIMAI · Mi pedido",
  manifest: "/manifest-tracker.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mi pedido",
  },
};
