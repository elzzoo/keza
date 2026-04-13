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
        bg:            "#F0F4F8",
        surface:       "#FFFFFF",
        card:          "#FFFFFF",
        "card-hover":  "#F8FAFC",
        border:        "#E2E8F0",
        "border-light":"#CBD5E1",
        fg:            "#0F172A",
        accent:        "#3B82F6",
        "accent-light":"#2563EB",
        "accent-dim":  "#DBEAFE",
        gold:          "#D97706",
        "gold-light":  "#F59E0B",
        success:       "#059669",
        "success-dim": "#D1FAE5",
        warn:          "#EA580C",
        danger:        "#DC2626",
        muted:         "#64748B",
        "muted-2":     "#94A3B8",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "hero":         "linear-gradient(160deg, #EEF2FF 0%, #F0F4F8 50%, #EFF6FF 100%)",
        "card-grad":    "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
        "miles-band":   "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
        "consider-band":"linear-gradient(135deg, #047857 0%, #059669 100%)",
        "cash-band":    "linear-gradient(135deg, #B45309 0%, #D97706 100%)",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.04)",
        "accent":  "0 0 24px rgba(59,130,246,0.18)",
        "glow-blue":"0 4px 20px rgba(59,130,246,0.12)",
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
