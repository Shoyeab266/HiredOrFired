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
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9dffd",
          300: "#7cc4fc",
          400: "#36a6f8",
          500: "#0c8ae9",
          600: "#006ec7",
          700: "#0158a1",
          800: "#064b85",
          900: "#0b3f6e",
          950: "#072849",
        },
      },
    },
  },
  plugins: [],
};
export default config;
