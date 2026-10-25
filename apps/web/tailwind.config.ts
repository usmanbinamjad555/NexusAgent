import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          50: "#f0f4ff",
          100: "#e0e9fe",
          200: "#c7d6fe",
          300: "#a5bafc",
          400: "#8195f8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#1e1b4b",
          950: "#0b0f19",
        },
      },
    },
  },
  plugins: [],
};

export default config;
