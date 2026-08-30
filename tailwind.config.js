/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#090d16',
          900: '#0f172a',
          850: '#151e32',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          950: '#022c22',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',
        }
      }
    },
  },
  plugins: [],
}
