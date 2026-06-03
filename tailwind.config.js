/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Design tokens ──────────────────────────────────────────────
        // To re-brand the app, change these three values. Everything else
        // (buttons, accents, dark sections) is derived from them.
        accent: {
          DEFAULT: '#C6F141', // bold "volt lime" — the single accent pop
          ink: '#1A2400', // dark text that sits readably ON the accent
        },
        ink: '#0E140C', // warm near-black — primary text / dark surfaces
        paper: '#F7F5EF', // warm off-white — page background
        court: {
          DEFAULT: '#002c1e', // deep racing green — premium dark sections (brand)
          soft: '#0A4530', // lighter green for cards/rows on dark surfaces
        },
        muted: '#5B6356', // muted body text on light (passes 4.5:1 on paper)
      },
      fontFamily: {
        // Display: condensed, athletic. Body: humanist, calm. (See index.css)
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      maxWidth: {
        content: '72rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // logo rolls in from the left like a ball (translate + clockwise spin)
        'roll-in': {
          '0%': { opacity: '0', transform: 'translateX(-65vw) rotate(-720deg)' },
          '55%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'translateX(0) rotate(0deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'roll-in': 'roll-in 1.2s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
