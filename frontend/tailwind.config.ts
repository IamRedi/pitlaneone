import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101419",
        brand: {
          DEFAULT: "#A66F36",
          dark: "#8F5D2C",
          soft: "#F4E3CF"
        },
        mist: "#F7F8F8",
        slate: "#36404A"
      },
      boxShadow: {
        panel: "0 20px 50px rgba(16, 20, 25, 0.12)"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
