/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./client/src/**/*.{js,ts,jsx,tsx}", "./index.html"],
  theme: {
    extend: {
      fontFamily: {
        testtiempo: ["TestTiempoText", "serif"],
      },
      colors: {
        aframeRed: "#E03E3E",
        aframeOrange: "#EF6C30",
        aframeYellow: "#F7C11F",
        aframeBlue: "#0099CC",
        aframePurple: "#6B4C9A", // muted purple for vintage style
        background: "#000000",
        foreground: "#FFFFFF",
      },
      backgroundImage: {
        "aframe-rainbow":
          "linear-gradient(90deg, #E03E3E, #EF6C30, #F7C11F, #6B4C9A, #0099CC)",
      },
    },
  },
  plugins: [],
};
