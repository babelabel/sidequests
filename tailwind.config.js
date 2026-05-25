/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      lineClamp: {
        2: '2'
      }
    }
  },
  plugins: []
};
