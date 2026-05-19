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
        teal: {
          50: "#EDFCF6",
          100: "#D4F7E8",
          200: "#ACEFD6",
          300: "#75E2BF",
          400: "#3DCDA3",
          500: "#1D9E75",
          600: "#0F8A66",
          700: "#0C6E53",
          800: "#0C5743",
          900: "#0A4838",
          950: "#052920",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
