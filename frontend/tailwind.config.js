/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F4EF',
        paperDeep: '#F0EBE2',
        surface: '#FFFFFF',
        ink: '#12100D',
        ink2: '#3D372F',
        muted: '#7A7168',
        line: '#E4DDD2',
        lineSoft: '#EEE8DE',
        accent: '#1F5340',
        accentDeep: '#173F31',
        accentSoft: '#E7EFEA',
        brass: '#A97C2C',
        mint: '#8FC0A9',
        brassSoft: '#F4EDDF',
        clay: '#A63D25',
        claySoft: '#F7E9E4',
        night: '#14120F',
        nightUp: '#1D1A15',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: { widest2: '0.18em' },
      borderRadius: { '4xl': '1.75rem' },
      boxShadow: {
        card: '0 1px 2px rgba(18,16,13,0.04), 0 14px 34px -20px rgba(18,16,13,0.22)',
        lift: '0 1px 2px rgba(18,16,13,0.04), 0 26px 50px -24px rgba(18,16,13,0.30)',
        float: '0 2px 4px rgba(18,16,13,0.03), 0 40px 80px -40px rgba(18,16,13,0.40)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        breathe: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        ping2: { '0%': { transform: 'scale(1)', opacity: '0.55' }, '80%,100%': { transform: 'scale(2.4)', opacity: '0' } },
      },
      animation: {
        rise: 'rise 700ms cubic-bezier(0.22,1,0.36,1) both',
        fade: 'fade 500ms ease-out both',
        breathe: 'breathe 7s ease-in-out infinite',
        ping2: 'ping2 2.4s cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
}
