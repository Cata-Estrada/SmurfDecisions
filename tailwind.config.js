/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#e1ebf4',
          500: '#1e40af', // Azul institucional serio
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#172554',
          900: '#0f172a'
        },
        risk: {
          high: '#dc2626',   // Rojo Alto
          medium: '#d97706', // Ámbar Medio
          low: '#16a34a'     // Verde Bajo
        }
      }
    },
  },
  plugins: [],
}
