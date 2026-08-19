import type { Config } from "tailwindcss";

/**
 * Brand tokens for SHIMAI SUSHI HOUSE.
 * Tailwind v4 loads this via `@config` in `src/app/globals.css`.
 */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "deep-black": "#080808",
        gold: "#C9A45C",
        sakura: "#E8A5B5",
        ivory: "#F4EBDD",
        "seal-red": "#9E3030",
        "shimai-black": "#080808",
        "shimai-gold": "#C9A45C",
        "shimai-sakura": "#E8A5B5",
        "shimai-ivory": "#F4EBDD",
        "shimai-surface": "#1a1a1a",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
