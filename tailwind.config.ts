import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#0B0E11",
        foreground: "#F9FAFB",
        card: {
          DEFAULT: "#151A23",
          foreground: "#F9FAFB",
        },
        popover: {
          DEFAULT: "#151A23",
          foreground: "#F9FAFB",
        },
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
          glow: "rgba(59, 130, 246, 0.5)",
        },
        secondary: {
          DEFAULT: "#2A3241",
          foreground: "#F9FAFB",
        },
        muted: {
          DEFAULT: "#1F2937",
          foreground: "#9CA3AF",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#10B981",
        },
        warning: {
          DEFAULT: "#F59E0B",
        },
        border: "#2A3241",
        input: "#1F2937",
        ring: "#3B82F6",
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        "glow-primary": "0 0 20px -5px rgba(59, 130, 246, 0.3)",
        "glow-danger": "0 0 20px -5px rgba(239, 68, 68, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
