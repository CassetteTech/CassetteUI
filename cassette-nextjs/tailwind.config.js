/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // NEW: Map your entire theme palette
        brandRed: "hsl(var(--brand-red))",
        brandRedL: "hsl(var(--brand-red-l))",
        brandRedD: "hsl(var(--brand-red-d))",
        brandBlack: "hsl(var(--brand-black))",
        brandBlackL: "hsl(var(--brand-black-l))",
        brandBlackD: "hsl(var(--brand-black-d))",
        brandCream: "hsl(var(--brand-cream))",
        brandCreamL: "hsl(var(--brand-cream-l))",
        brandCreamD: "hsl(var(--brand-cream-d))",
        
        success: "hsl(var(--success))",
        info: "hsl(var(--info))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        
        accentTeal: "hsl(var(--accent-teal))",
        accentLilac: "hsl(var(--accent-lilac))",
        
        textOnDark: "hsl(var(--text-on-dark))",
        textSecondary: "hsl(var(--text-secondary))",
        textHint: "hsl(var(--text-hint))",
        
        bgCanvas: "hsl(var(--bg-canvas))",
        bgElevated: "hsl(var(--bg-elevated))",
        bgSubtle: "hsl(var(--bg-subtle))",
        bgCream: "hsl(var(--bg-cream))",
        
        borderLight: "hsl(var(--border-light))",
        borderDark: "hsl(var(--border-dark))",
        
        dividerLight: "hsl(var(--divider-light))",
        dividerDark: "hsl(var(--divider-dark))",
        
        // Button tokens
        btnPrimaryTop: "hsl(var(--btn-primary-top))",
        btnPrimaryBottom: "hsl(var(--btn-primary-bottom))",
        btnPrimaryBorder: "hsl(var(--btn-primary-border))",
        btnConvertTop: "hsl(var(--btn-convert-top))",
        btnConvertBottom: "hsl(var(--btn-convert-bottom))",
        btnConvertBorder: "hsl(var(--btn-convert-border))",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}

