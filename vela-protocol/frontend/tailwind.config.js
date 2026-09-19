/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4D596A',
        accent: '#7A2938',
        success: '#1F7068',
        background: '#ECE7DE',
        surface: '#F7F4EE',
        ink: '#172133',
        muted: '#697181',
      }
    },
  },
  plugins: [],
}
