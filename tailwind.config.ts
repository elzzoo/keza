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
      colors: {
        bg:            "#0D1B2E",
        surface:       "#142438",
        card:          "#1A2E46",
        "card-hover":  "#1F3650",
        border:        "#243D58",
        "border-light":"#2E4E6B",
        accent:        "#3B82F6",
        "accent-light":"#60A5FA",
        "accent-dim":  "#1D4ED8",
        gold:          "#F59E0B",
        "gold-light":  "#FCD34D",
        success:       "#10B981",
        "success-dim": "#064E3B",
        warn:          "#F97316",
        danger:        "#EF4444",
        muted:         "#7A90A8",
        "muted-2":     "#A8BECC",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "hero":         "linear-gradient(160deg, #0D1B2E 0%, #132035 50%, #0D1B2E 100%)",
        "card-grad":    "linear-gradient(135deg, #1A2E46 0%, #142438 100%)",
        "miles-band":   "linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)",
        "consider-band":"linear-gradient(135deg, #065F46 0%, #047857 100%)",
        "cash-band":    "linear-gradient(135deg, #92400E 0%, #B45309 100%)",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
        "accent":  "0 0 24px rgba(59,130,246,0.25)",
        "glow-blue":"0 0 40px rgba(59,130,246,0.15)",
      },
      animation: {
        "slide-up":  "slideUp 0.4s ease-out",
        "fade-in":   "fadeIn 0.3s ease-out",
        "shimmer":   "shimmer 1.8s infinite linear",
        "float":     "float 6s ease-in-out infinite",
      },
      keyframes: {
        slideUp:  { "0%": { opacity:"0", transform:"translateY(16px)" }, "100%": { opacity:"1", transform:"translateY(0)" } },
        fadeIn:   { "0%": { opacity:"0" }, "100%": { opacity:"1" } },
        shimmer:  { "0%": { backgroundPosition:"-1000px 0" }, "100%": { backgroundPosition:"1000px 0" } },
        float:    { "0%,100%": { transform:"translateY(0px)" }, "50%": { transform:"translateY(-6px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
