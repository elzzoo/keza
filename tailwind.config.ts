import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        // ── Dark palette ───────────────────────────────
        bg:              "#0B1120",   // page background (deep navy)
        surface:         "#131C31",   // cards, form panel
        "surface-2":     "#1A2540",   // inputs, tags, elevated
        border:          "#1E2D48",   // all borders
        fg:              "#F1F5F9",   // primary text
        muted:           "#64748B",   // secondary text
        subtle:          "#334155",   // dividers, tertiary
        primary:         "#3B82F6",
        "primary-hover": "#2563EB",
        "primary-dim":   "rgba(59,130,246,0.15)",
        success:         "#34D399",   // GREEN — savings only
        warning:         "#F59E0B",
        danger:          "#EF4444",
      },
      boxShadow: {
        card:        "0 2px 12px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.04)",
        "card-hover":"0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06)",
        blue:        "0 8px 32px rgba(59,130,246,.30)",
        "blue-sm":   "0 4px 16px rgba(59,130,246,.20)",
        glow:        "0 0 24px rgba(59,130,246,.15)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "fade-up":  "fadeUp 0.3s ease-out forwards",
        "fade-in":  "fadeIn 0.2s ease-out forwards",
        "pulse-dot":"pulseDot 2s ease-in-out infinite",
        "float":    "float 6s ease-in-out infinite",
        "shimmer":  "shimmer 1.8s ease-in-out infinite",
      },
      keyframes: {
        fadeUp:   { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:   { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".4" } },
        float:    { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer:  { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
    },
  },
  plugins: [],
};

export default config;
