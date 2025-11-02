/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        aframeRed: "#E03E3E",
        aframeOrange: "#EF6C30",
        aframeYellow: "#F7C11F",
        aframeBlue: "#0099CC",
        aframePurple: "#8B5FBF",
        background: "#000000",
        foreground: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
