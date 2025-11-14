/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uide-blue': '#003366',
        'uide-orange': '#FF6B35',
      }
    },
  },
  plugins: [],
}

