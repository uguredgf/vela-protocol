/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#52627A',
        accent: '#6C63A8',
        success: '#2E8B75',
        background: '#DCE3ED',
        surface: '#EEF1F5',
        ink: '#263247',
        muted: '#66738A',
      }
    },
  },
  plugins: [],
}
