/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        "primary-dark": "#1D4ED8",
        dark: "#111827",
        "card-bg": "#F9FAFB",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        muted: "#6B7280",
        "muted-light": "#9CA3AF",
        border: "#E5E7EB",
        "navy-start": "#1E293B",
        "navy-end": "#0F172A",
      },
      borderRadius: {
        card: "16px",
        button: "16px",
        input: "16px",
        xl2: "20px",
      },
      spacing: {
        "grid-1": "8px",
        "grid-2": "16px",
        "grid-3": "24px",
        "grid-4": "32px",
        "grid-5": "40px",
      },
    },
  },
  plugins: [],
};
