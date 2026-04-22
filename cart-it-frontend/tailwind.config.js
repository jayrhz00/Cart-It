/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'solar-orange': '#FF8A00',
        'cart-purple': '#2D1B36',
      },
    },
  },
  plugins: [],
}