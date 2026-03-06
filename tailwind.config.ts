import type { Config } from "tailwindcss";
import { tenant } from "./lib/config/tenant";

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
        gold: tenant.colors.primary,
        // Brand colors from tenant config
        brand: {
          gold: {
            DEFAULT: tenant.colors.primary,
            light: tenant.colors.primaryLight,
            dark: tenant.colors.primaryDark,
          },
          black: tenant.colors.background,
          charcoal: tenant.colors.surface,
        },
        // Dark theme colors
        dark: {
          100: '#3D3D3D',
          200: tenant.colors.surface,
          300: tenant.colors.background,
          400: '#121212',
        },
        // Semantic colors
        primary: {
          50: '#FDF9F0',
          100: '#FCF3E1',
          200: '#F8E4B8',
          300: '#F4D58F',
          400: tenant.colors.primaryLight,
          500: tenant.colors.primary,
          600: tenant.colors.primaryDark,
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
