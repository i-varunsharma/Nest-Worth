/** @type {import('tailwindcss').Config} */

/*
  tailwind.config.js
  ------------------
  THE THEME LIVES HERE. This file is the single source of truth for every colour,
  font, shadow and animation on the site. Change a value here and it changes
  everywhere at once, on the landing page and on the login and signup screens.

  Once a colour is named below you use it as a Tailwind class, so "accent"
  becomes text-accent, bg-accent, border-accent, and so on.

  The look we are going for is a quiet, expensive-feeling finance site:
  warm paper, near-black ink, and ONE strong colour rather than a rainbow.
*/

export default {
  // Where Tailwind looks for class names. Anything not matched here gets
  // stripped out of the final CSS, which is why the file stays small.
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      colors: {
        // ---- Backgrounds ----
        paper: '#F7F4EF',      // the main page background, a warm off-white
        paperDeep: '#F0EBE2',  // slightly darker, for alternating sections
        surface: '#FFFFFF',    // cards sitting on top of the page

        // ---- Text ----
        ink: '#12100D',        // headings and anything important
        ink2: '#3D372F',       // body text, softer than ink
        muted: '#7A7168',      // captions, labels, small print

        // ---- Lines ----
        line: '#E4DDD2',       // normal borders
        lineSoft: '#EEE8DE',   // dividers inside a card, quieter still
        lineStrong: '#D6CCBE', // the darkest line, used on the chart

        // ---- The one accent: a deep evergreen ----
        // Green reads as growth and money without shouting, and it stays
        // legible on both the pale and the dark sections.
        accent: '#1F5340',
        accentDeep: '#173F31',  // the hover state, one shade darker
        accentSoft: '#E7EFEA',  // a pale tint for backgrounds
        mint: '#8FC0A9',        // a lighter green, for use ON the dark sections

        // ---- Brass: the secondary highlight ----
        brass: '#A97C2C',
        brassSoft: '#F4EDDF',

        // ---- Clay: warnings only, never decoration ----
        clay: '#A63D25',
        claySoft: '#F7E9E4',

        // ---- The dark sections ----
        night: '#14120F',

        /*
          ---- Chart colours ----

          The colours above were chosen to be READ: headings, borders, a button.
          A chart needs something different from a colour, which is to be told
          apart from the colour next to it, including by somebody who cannot
          distinguish red from green. Around one man in twelve cannot.

          So these are not reused UI colours. They sit on the same hues as the
          theme, evergreen and brass, lifted into the lightness and saturation
          band where they stay separable, and they were checked with a validator
          rather than by eye. Dropping "accent" into a chart looks right on this
          screen and collapses into the gold beside it under colourblindness.

          There are three, and only three, because three is what the money can
          actually be divided into once it is yours: spent, saved, invested.
          Everything before that is chartCommitted, which is deliberately a
          quiet grey rather than a fourth colour: it is not a choice you make,
          it is the part that has already gone, and giving it a hue would make
          it compete with the parts you can do something about.
        */
        chartSpend: '#3275B4',      // a cool slate, the counterweight to the warm page
        chartSave: '#B07A00',       // the theme's brass, deepened for a chart
        chartInvest: '#007654',     // the theme's evergreen, lifted for a chart
        chartCommitted: '#CFC6B8',  // already spoken for. Context, not a choice.

        /*
          One hue, light to dark, for when the message is "how much" rather than
          "which one". Used for the safety-net meter. The lightest step is not as
          pale as it could be, because it has to stay visible against a white
          card, which is what a decorative tint would fail to do.
        */
        chartRamp1: '#80B9A1',
        chartRamp2: '#439C7B',
        chartRamp3: '#007C5A',
        chartRamp4: '#005E40',

        // The de-emphasis grey. Every scenario except the one being looked at
        // is drawn in this, so the eye lands on one line rather than four.
        chartMuted: '#C8BFB2',
      },

      fontFamily: {
        // font-sans is the default for the whole site.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],

        // font-display is only for headings. A serif against a plain sans is
        // what makes the page feel like a magazine rather than a dashboard.
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },

      fontSize: {
        // Tailwind stops at "xs", and we needed one step smaller for labels.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },

      letterSpacing: {
        // Extra-wide spacing for the small uppercase labels.
        widest2: '0.18em',
      },

      borderRadius: {
        '4xl': '1.75rem',
      },

      boxShadow: {
        // All three are warm and very soft. Hard grey shadows look cheap.
        card: '0 1px 2px rgba(18,16,13,0.04), 0 14px 34px -20px rgba(18,16,13,0.22)',
        lift: '0 1px 2px rgba(18,16,13,0.04), 0 26px 50px -24px rgba(18,16,13,0.30)',
        float: '0 2px 4px rgba(18,16,13,0.03), 0 40px 80px -40px rgba(18,16,13,0.40)',
      },

      transitionTimingFunction: {
        // Used everywhere as "ease-smooth". It starts fast and settles gently,
        // which feels much more expensive than a plain linear move.
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        // The expanding ring behind the small "live" dot.
        ping2: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '80%, 100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },

      animation: {
        ping2: 'ping2 2.4s cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },

  plugins: [],
};
