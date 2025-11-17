/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9e9ff',
          200: '#b7d6ff',
          300: '#8bbeff',
          400: '#5398ff',
          500: '#2f6dff',
          600: '#1f4edb',
          700: '#1b40b3',
          800: '#1a378f',
          900: '#172d70',
        },
        slate: {
          950: '#02091a',
        },
      },
      boxShadow: {
        floating: '0px 18px 45px rgba(15, 23, 42, 0.18)',
        ringed: '0 0 0 1px rgba(255,255,255,0.1)',
      },
      borderRadius: {
        xl: '1.25rem',
      },
      backgroundImage: {
        'brand-grid':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
