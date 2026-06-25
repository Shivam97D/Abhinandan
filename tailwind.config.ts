import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "maroon-deep":   "var(--maroon-deep)",
        "maroon":        "var(--maroon)",
        "brown":         "var(--brown)",
        "amber-brand":   "var(--amber-brand)",
        "amber-deep":    "var(--amber-deep)",
        "gold-pale":     "var(--gold-pale)",
        "gold-bg":       "var(--gold-bg)",
        "ink":           "var(--ink)",
        "muted-warm":    "var(--muted-warm)",
        "border-warm":   "var(--border-warm)",
        "hover-warm":    "var(--hover-warm)",
        "success-brand": "var(--success-brand)",
        "pending-brand": "var(--pending-brand)",
        "background":    "var(--background)",
        "foreground":    "var(--foreground)",
        "card":          "var(--card)",
      },
      fontFamily: {
        sans:        ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display:     ["Playfair Display", "Georgia", "serif"],
        deva:        ["Noto Serif Devanagari", "Mangal", "serif"],
        space:       ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      boxShadow: {
        "warm":    "0 4px 20px rgba(45, 10, 10, 0.08)",
        "warm-lg": "0 8px 28px rgba(45, 10, 10, 0.12)",
        "amber":   "0 4px 14px rgba(232, 146, 10, 0.30)",
      },
    },
  },
  plugins: [],
};
export default config;
