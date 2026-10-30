import type { Config } from "tailwindcss";

// Palette: a drafting-sheet look. Cool grey paper, ink for text, one print-blue for
// the drawing itself, and a red pencil reserved for risks and revisions.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDF0F2",
        sheet: "#FAFBFC",
        ink: "#17233B",
        muted: "#55617A",
        rule: "#C5CCD6",
        print: "#1E4FD6",
        "print-soft": "#DCE5FB",
        pencil: "#C8402C",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
