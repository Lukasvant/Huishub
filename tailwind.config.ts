import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f1e8",
        panel: "#fffdf8",
        ink: "#1a1a1a",
        muted: "#5a5a5a",
        dim: "#8a8a8a",
        line: "rgba(26, 26, 26, 0.14)",
        sage: {
          50: "#e9fbfd",
          100: "#c9f3f7",
          500: "#00abc2",
          600: "#008fa3",
        },
        warm: "#efe0d3",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        calm: "0 1px 0 rgba(26,26,26,0.05), 0 18px 60px rgba(26,26,26,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
