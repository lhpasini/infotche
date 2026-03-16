import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./**/*.{js,ts,jsx,tsx,mdx}", // OPÇÃO NUCLEAR: Lê qualquer arquivo em qualquer pasta
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;