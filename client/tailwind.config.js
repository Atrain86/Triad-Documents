/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
colors: {
  aframeBlack: '#000000',
  aframeRed: '#E03E3E',
  aframeOrange: '#EF6C30',
  aframeYellow: '#F7C11F',
  aframeBlue: '#0099CC',
  aframePurple: '#6B4C9A',
  background: '#000000',
  foreground: '#FFFFFF',
  primary: {
    DEFAULT: '#007bff',
    dark: '#0056b3',
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
