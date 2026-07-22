import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#071A2B",
        "navy-deep": "#04111D",
        green: "#55E889",
        "green-pale": "#DDFBE7",
        offwhite: "#F7F8F3",
        gray: "#66727C",
        steel: {
          100: "#E7E9E4",
          200: "#D3D6CF",
          400: "#9AA0A6",
          600: "#66727C",
          800: "#3A424A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
