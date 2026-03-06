/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — deep navy (government/maritime authority)
        navy: {
          50:  '#f0f4fa',
          100: '#dce6f5',
          200: '#b9cce8',
          300: '#8aaed6',
          400: '#5a8dc0',
          500: '#3570a8',
          600: '#255a8e',
          700: '#1a4470',
          800: '#112f53',
          900: '#0c2040',
          950: '#071529',
        },
        // Accent — Vanuatu gold
        gold: {
          300: '#f0d580',
          400: '#e6c255',
          500: '#d4a92a',
          600: '#b88f1a',
        },
        // Keep ocean for backwards compat (mapped to navy)
        ocean: {
          50:  '#f0f4fa',
          100: '#dce6f5',
          200: '#b9cce8',
          300: '#8aaed6',
          400: '#5a8dc0',
          500: '#3570a8',
          600: '#255a8e',
          700: '#1a4470',
          800: '#112f53',
          900: '#0c2040',
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
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md':'0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        'card-lg':'0 10px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
