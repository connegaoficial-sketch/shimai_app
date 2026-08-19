import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/**
 * `@ducanh2912/next-pwa` is the maintained fork of `next-pwa`
 * compatible with Next.js App Router. It injects a webpack plugin,
 * so production builds must run with `--webpack` (see package.json).
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next-pwa injects webpack; Next 16 defaults to Turbopack in `next dev`.
  // Empty turbopack config allows local development (PWA is disabled in NODE_ENV=development).
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ikxbuqebgbeciznedgkj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
