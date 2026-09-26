import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D0F14",
        surface: "#15171F",
        "surface-raised": "#1B1E28",
        "surface-container-low": "#111318",
        "on-surface": "#F1F3F9",
        "on-surface-variant": "#9DA3B4",
        outline: "#5A6072",
        primary: "#8B7CFF",
        "on-primary": "#0D0F14",
        secondary: "#3ECF8E",
        warning: "#F5A742",
        danger: "#F0616B",
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;