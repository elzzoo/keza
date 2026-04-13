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
        surface:       "#0F0F0F",
        "surface-2":   "#161616",
        card:          "#1C1C1C",
        "card-hover":  "#212121",
        border:        "#252525",
        "border-light":"#333333",
        accent:        "#0EA5E9",
        "accent-dim":  "#0284C7",
        "accent-vivid":"#38BDF8",
        gold:          "#D4A843",
        "gold-light":  "#F0C96B",
        muted:         "#64748B",
        "muted-2":     "#475569",
        success:       "#10B981",
        warn:          "#F59E0B",
        danger:        "#EF4444",
        great:         "#0EA5E9",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(160deg, #0c1a2e 0%, #0f0f0f 55%, #0f0f0f 100%)",
        "card-gradient":
          "linear-gradient(135deg, #1c1c1c 0%, #161616 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #D4A843 0%, #F0C96B 100%)",
      },
      boxShadow: {
        "accent-glow": "0 0 24px rgba(14, 165, 233, 0.18)",
        "gold-glow":   "0 0 24px rgba(212, 168, 67, 0.15)",
        "card-hover":  "0 8px 32px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "pulse-slow":    "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up":      "slideUp 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.5s ease-out",
        "fade-in":       "fadeIn 0.3s ease-out",
        "shimmer":       "shimmer 1.8s infinite linear",
      },
      keyframes: {
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
