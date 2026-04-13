import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#111111",
        card: "#1A1A1A",
        border: "#2A2A2A",
        accent: "#0EA5E9",
        "accent-dim": "#0284C7",
        muted: "#6B7280",
        success: "#10B981",
        warn: "#F59E0B",
        danger: "#EF4444",
        "great": "#0EA5E9", // same as accent — used for GREAT badge tier
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
