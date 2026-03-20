import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "glass-dark": "rgba(15, 15, 20, 0.7)",
        "glass-light": "rgba(255, 255, 255, 0.1)",
        "glass-border": "rgba(255, 255, 255, 0.18)",
        "accent": {
          dark: "#00D9FF",
          light: "#FF6B6B",
        }
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-outfit)", "sans-serif"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.6s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%": { filter: "brightness(1) drop-shadow(0 0 10px currentColor)" },
          "100%": { filter: "brightness(1.2) drop-shadow(0 0 20px currentColor)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
