/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1E3B',
        'dark-navy': '#060F1E',
        cyan: '#00F0FF',
        steel: '#4A6FA5',
        ice: '#F5F7FA',
        gold: '#F0B429',
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
