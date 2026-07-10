/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // Compile all `hover:` variants inside @media (hover: hover) and (pointer: fine)
  // so hover styles don't false-fire (and stick) on touch taps.
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Font utilities map to the next/font CSS variables set in src/app/layout.tsx.
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        teko: ["var(--font-teko)", "ui-sans-serif", "sans-serif"],
        atkinson: ["var(--font-atkinson)", "ui-sans-serif", "sans-serif"],
        "roboto-flex": ["var(--font-roboto-flex)", "ui-sans-serif", "sans-serif"],
        // Legacy alias: Roboto was never loaded; these usages get Roboto Flex.
        roboto: ["var(--font-roboto-flex)", "ui-sans-serif", "sans-serif"],
      },
      // Named values so we avoid arbitrary duration-[...]/ease-[...] classes,
      // which are ambiguous with tailwindcss-animate and silently dropped.
      transitionDuration: {
        280: "280ms",
        400: "400ms",
        450: "450ms",
        1100: "1100ms",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-quart": "cubic-bezier(0.64, 0, 0.78, 0)",
      },
      letterSpacing: {
        "custom-2": "0.02em",
        "custom-4": "0.04em",
        "custom-5": "0.05em",
        "custom-7": "0.07em",
      },
      boxShadow: {
        main: "0 4px 12px rgba(0, 0, 0, 0.12)",
        // Retro offset shadows (neo-brutalist brand language).
        // Numeric suffix = offset in px; color variants for dark sections and hovers.
        "flat-2": "2px 2px 0 0 hsl(var(--foreground))",
        "flat-3": "3px 3px 0 0 hsl(var(--foreground))",
        "flat-4": "4px 4px 0 0 hsl(var(--foreground))",
        "flat-5": "5px 5px 0 0 hsl(var(--foreground))",
        "flat-6": "6px 6px 0 0 hsl(var(--foreground))",
        "flat-white-4": "4px 4px 0 0 hsl(var(--cassette-white))",
        "flat-white-5": "5px 5px 0 0 hsl(var(--cassette-white))",
        "flat-white-6": "6px 6px 0 0 hsl(var(--cassette-white))",
        "flat-primary-3": "3px 3px 0 0 hsl(var(--primary))",
        "flat-primary-4": "4px 4px 0 0 hsl(var(--primary))",
        "flat-primary-6": "6px 6px 0 0 hsl(var(--primary))",
        "flat-primary-7": "7px 7px 0 0 hsl(var(--primary))",
        "flat-primary-8": "8px 8px 0 0 hsl(var(--primary))",
        "flat-destructive-2": "2px 2px 0 0 hsl(var(--destructive))",
        "flat-destructive-3": "3px 3px 0 0 hsl(var(--destructive))",
        "flat-destructive-4": "4px 4px 0 0 hsl(var(--destructive))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        field: "hsl(var(--field))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        accentRoyal: {
          DEFAULT: "hsl(var(--accent-royal))",
          foreground: "hsl(var(--accent-royal-foreground))",
        },
        // Domain accent — remapped per console section via .domain-eng / .domain-growth.
        domain: {
          DEFAULT: "hsl(var(--domain))",
          foreground: "hsl(var(--domain-foreground))",
          muted: "hsl(var(--domain-muted))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          text: "hsl(var(--success-text))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          text: "hsl(var(--info-text))",
          foreground: "hsl(var(--info-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          text: "hsl(var(--warning-text))",
          foreground: "hsl(var(--warning-foreground))",
        },
        platform: {
          spotify: "hsl(var(--platform-spotify))",
          "apple-music": "hsl(var(--platform-apple-music))",
          youtube: "hsl(var(--platform-youtube))",
          tidal: "hsl(var(--platform-tidal))",
          deezer: "hsl(var(--platform-deezer))",
          foreground: "hsl(var(--platform-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        section: {
          dark: {
            DEFAULT: "hsl(var(--section-dark))",
            fg: "hsl(var(--section-dark-fg))",
          },
          wine: {
            DEFAULT: "hsl(var(--section-wine))",
            fg: "hsl(var(--section-wine-fg))",
          },
          navy: {
            DEFAULT: "hsl(var(--section-navy))",
            fg: "hsl(var(--section-navy-fg))",
          },
          cream: {
            DEFAULT: "hsl(var(--section-cream))",
            fg: "hsl(var(--section-cream-fg))",
          },
        },
        editorial: {
          rule: "hsl(var(--editorial-rule))",
          "rule-subtle": "hsl(var(--editorial-rule-subtle))",
        },
        pullquote: {
          bg: "hsl(var(--pullquote-bg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        // Skeleton (src/components/ui/skeleton.tsx) sweeps a gradient overlay
        // left-to-right across the placeholder surface.
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        // Radix Collapsible open/close — animate to the measured content height.
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        "collapsible-down": "collapsible-down 200ms ease-out",
        "collapsible-up": "collapsible-up 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
