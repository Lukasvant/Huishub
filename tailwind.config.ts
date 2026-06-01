import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f6f3",
        panel: "#ffffff",
        ink: "#1c2521",
        muted: "#65726b",
        sage: {
          50: "#f0f5f1",
          100: "#dfeae2",
          500: "#51755c",
          600: "#41624c",
        },
        warm: "#f3efe8",
      },
      boxShadow: {
        calm: "0 1px 3px rgba(28,37,33,0.05), 0 12px 28px rgba(28,37,33,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
