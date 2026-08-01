/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14213D',
          light: '#233252',
        },
        paper: {
          DEFAULT: '#F7F6F1',
          card: '#FFFFFF',
          dark: '#EFECE6',
        },
        steel: {
          DEFAULT: '#5C6B73',
          light: '#8D99AE',
        },
        amberCustom: {
          DEFAULT: '#C8862A',
          light: '#FEF3C7',
        },
        sageCustom: {
          DEFAULT: '#3E6E5B',
          light: '#D1E7DD',
        },
        rustCustom: {
          DEFAULT: '#A6394A',
          light: '#F8D7DA',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
