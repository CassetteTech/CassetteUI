import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Colors are now defined in CSS using @theme directive
      // Keep only non-color theme extensions here
      fontFamily: {
        // Primary fonts from Flutter
        'teko': ['Teko', 'sans-serif'],
        'roboto-flex': ['var(--font-roboto-flex)', 'Roboto Flex', 'sans-serif'],
        'atkinson': ['var(--font-atkinson)', 'Atkinson Hyperlegible', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'sans': ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Flutter-based font sizes
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '36px',
        '5xl': '38px',
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      letterSpacing: {
        'tight': '-0.025em',
        'normal': '0em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
        'custom-1': '0.65px',
        'custom-2': '0.72px',
        'custom-3': '0.96px',
        'custom-4': '1px',
        'custom-5': '1.08px',
        'custom-6': '1.26px',
        'custom-7': '1.44px',
        'custom-8': '1.5px',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'default': '5px',
        'md': '8px',
        'lg': '10px',
        'xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        // Main container shadow from Flutter
        'main': '0 4px 4px rgba(0, 0, 0, 0.3), 0 8px 12px rgba(0, 0, 0, 0.15)',
        // Album cover shadow
        'album': '0 4px 4px rgba(0, 0, 0, 0.25)',
        // Button depth shadow
        'button': '0 2px 4px rgba(0, 0, 0, 0.2)',
        // Soft elevation
        'soft': '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        // Flutter-based spacing system
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '46': '11.5rem',
        '50': '12.5rem',
        '54': '13.5rem',
        '58': '14.5rem',
        '62': '15.5rem',
        '66': '16.5rem',
        '70': '17.5rem',
        '74': '18.5rem',
        '78': '19.5rem',
        '82': '20.5rem',
        '86': '21.5rem',
        '90': '22.5rem',
        '94': '23.5rem',
        '98': '24.5rem',
      },
      backgroundImage: {
        // Gradient from Flutter
        'gradient-main': 'linear-gradient(180deg, #0093FF 0%, #FFFFFF 100%)',
        'gradient-track': 'linear-gradient(180deg, var(--tw-gradient-from) 0%, #FFFFFF 100%)',
      },
      animation: {
        // Add any custom animations here
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;