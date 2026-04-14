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
        bg:               "#F8FAFC",
        surface:          "#FFFFFF",
        card:             "#FFFFFF",
        border:           "#E2E8F0",
        "border-hover":   "#CBD5E1",
        primary:          "#2563EB",
        "primary-hover":  "#1D4ED8",
        "primary-dim":    "#DBEAFE",
        "primary-light":  "#EFF6FF",
        secondary:        "#06B6D4",
        fg:               "#0F172A",
        "fg-2":           "#334155",
        muted:            "#64748B",
        subtle:           "#94A3B8",
        success:          "#22C55E",
        "success-dim":    "#DCFCE7",
        "success-text":   "#15803D",
        warning:          "#F59E0B",
        "warning-dim":    "#FEF3C7",
        "warning-text":   "#B45309",
        danger:           "#EF4444",
        "danger-dim":     "#FEE2E2",
        "danger-text":    "#B91C1C",
      },
      backgroundImage: {
        "miles-band":    "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
        "consider-band": "linear-gradient(135deg, #047857 0%, #059669 100%)",
        "cash-band":     "linear-gradient(135deg, #B45309 0%, #D97706 100%)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card:   "0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)",
        "card-hover": "0 8px 24px rgba(0,0,0,.10), 0 0 0 1px rgba(0,0,0,.04)",
        blue:   "0 8px 32px rgba(37,99,235,.20)",
        "blue-sm": "0 4px 16px rgba(37,99,235,.15)",
        sm:     "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
        md:     "0 4px 16px rgba(0,0,0,.08)",
        lg:     "0 8px 32px rgba(0,0,0,.10)",
      },
      animation: {
        "fade-up":  "fadeUp 0.3s ease-out forwards",
        "fade-in":  "fadeIn 0.2s ease-out forwards",
        "spin-slow":"spin 2s linear infinite",
        "pulse-dot":"pulseDot 2s ease-in-out infinite",
        "float":    "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp:   { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:   { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".4" } },
        float:    { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
