/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#10b981',
          emerald: '#34d399',
          gold: '#fbbf24',
          amber: '#f59e0b',
          blue: '#38bdf8',
          red: '#ef4444',
          slate: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
