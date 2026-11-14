import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade Viviantourr — azul oceano, turquesa, areia
        tinta: {
          DEFAULT: "#0B2530", // texto principal / navy profundo
          soft: "#33525F",
          mute: "#6B8794",
        },
        oceano: {
          50: "#EFF7FA",
          100: "#D9EDF4",
          200: "#B3DBEA",
          300: "#7FC0DA",
          400: "#479FC5",
          500: "#1F81AC",
          600: "#14678E",
          700: "#105373",
          800: "#0D3F58",
          900: "#0B2E42",
          950: "#071E2C",
        },
        turquesa: {
          50: "#EFFAF8",
          100: "#D5F3EE",
          200: "#AEE7DE",
          300: "#78D4C8",
          400: "#40BAAC",
          500: "#1CA093",
          600: "#128077",
          700: "#126761",
          800: "#12524E",
          900: "#114441",
        },
        areia: {
          50: "#FBF9F4",
          100: "#F6F1E7",
          200: "#EDE3D0",
          300: "#E0D0B4",
          400: "#CFB790",
          500: "#C0A072",
          600: "#A98758",
        },
        coral: {
          400: "#FF8A65",
          500: "#F4703E",
          600: "#DE5828",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,37,48,.06), 0 8px 24px -12px rgba(11,37,48,.18)",
        pop: "0 12px 40px -12px rgba(11,37,48,.28)",
        widget: "0 4px 16px rgba(11,37,48,.10), 0 24px 56px -20px rgba(11,37,48,.30)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
