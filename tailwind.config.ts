import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // KeyHub brand colors from logo
        brand: {
          gold: {
            DEFAULT: '#D4A84B',
            light: '#E5C77A',
            dark: '#C9A227',
          },
          black: '#1A1A1A',
          charcoal: '#2D2D2D',
        },
        // Semantic colors
        primary: {
          50: '#FDF9F0',
          100: '#FCF3E1',
          200: '#F8E4B8',
          300: '#F4D58F',
          400: '#E5C77A',
          500: '#D4A84B',
          600: '#C9A227',
          700: '#A68621',
          800: '#836A1A',
          900: '#604E13',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
