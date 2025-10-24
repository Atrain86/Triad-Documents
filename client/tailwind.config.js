/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007bff',
          dark: '#0056b3',
        },
        background: {
          DEFAULT: '#000',
          dark: '#121212',
        },
        text: {
          DEFAULT: '#ffffff',
          muted: '#a0a0a0',
        }
      }
    },
  },
  plugins: [],
}
