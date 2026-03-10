/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // ── Primary — Vanuatu Dept. of Fisheries deep Pacific ocean blue ──
        navy: {
          50:  '#EEF6FF',
          100: '#D4E8FF',
          200: '#A9CFFF',
          300: '#6AAFFF',
          400: '#4AA8FF',  // ← Pacific ocean surface (replaces cyan accent)
          500: '#2389E8',
          600: '#0062E6',
          700: '#0051A8',
          800: '#003B7A',  // ← primary fisheries blue
          900: '#002855',
          950: '#001A38',
        },
        // ── Backwards-compat aliases (mapped to navy) ──
        ocean: {
          50:  '#EEF6FF',
          100: '#D4E8FF',
          200: '#A9CFFF',
          300: '#6AAFFF',
          400: '#4AA8FF',
          500: '#2389E8',
          600: '#0062E6',
          700: '#0051A8',
          800: '#003B7A',
          900: '#002855',
        },
        // ── Removed cyan 'gold' scale — now pure ocean light blue ──
        gold: {
          300: '#A9CFFF',  // light ocean blue
          400: '#6AAFFF',  // ocean blue
          500: '#4AA8FF',  // Pacific surface blue
          600: '#2389E8',  // deeper surface blue
        },
        coral: {
          50:  '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        reef: {
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'card':    '0 1px 4px rgba(0,27,70,0.06), 0 1px 2px rgba(0,27,70,0.04)',
        'card-md': '0 4px 16px rgba(0,27,70,0.10), 0 1px 4px rgba(0,27,70,0.05)',
        'card-lg': '0 12px 40px rgba(0,27,70,0.13), 0 2px 10px rgba(0,27,70,0.07)',
        'blue-glow': '0 0 24px rgba(0,98,230,0.35)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
