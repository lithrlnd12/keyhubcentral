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
        // Shorthand for brand gold (primary action color)
        gold: '#D4A84B',
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
        // Dark theme colors
        dark: {
          100: '#3D3D3D',
          200: '#2D2D2D',
          300: '#1A1A1A',
          400: '#121212',
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
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
