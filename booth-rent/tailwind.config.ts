import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3eee4",
        "paper-deep": "#e6dece",
        card: "#fbf8f2",
        ink: "#1a1714",
        "ink-soft": "#5e574c",
        line: "#d5ccbc",
        green: "#1e6b45",
        "green-deep": "#143d28",
        clay: "#b8431f",
        brass: "#8a6a2f",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        ledger: "0 1px 0 rgba(26, 23, 20, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
