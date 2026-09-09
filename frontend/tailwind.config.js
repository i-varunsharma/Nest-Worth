/** @type {import('tailwindcss').Config} */

/*
  tailwind.config.js
  ------------------
  THE THEME LIVES HERE. This file is the single source of truth for every colour,
  font, shadow and animation on the site. Change something here and it changes
  everywhere at once, on the landing page and on the login and signup screens.

  Once a colour is named below you use it as a Tailwind class, so "accent"
  becomes text-accent, bg-accent, border-accent, and so on.

  The look we are going for is a quiet, expensive-feeling finance site:
  warm paper, near-black ink, and ONE strong colour rather than a rainbow.

  ---- Why every colour below says "var(--something)" ----

  The names and the reasoning are here; the actual red, green and blue numbers
  are in src/styles/global.css. They had to move because a hex code written in
  this file is baked into the stylesheet when the site is built, and a baked
  value cannot be changed while the page is open. A CSS variable can, which is
  the whole of how dark mode works: one attribute on the <html> tag swaps the
  variables, and every class below follows without a single component knowing.

  The "<alpha-value>" placeholder is Tailwind's. It is what lets a class like
  "border-accent/25" work: Tailwind substitutes 0.25 into that slot.
*/

export default {
  // Where Tailwind looks for class names. Anything not matched here gets
  // stripped out of the final CSS, which is why the file stays small.
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      colors: {
        // ---- Backgrounds ----
        paper: 'rgb(var(--color-paper) / <alpha-value>)',      // the main page background
        paperDeep: 'rgb(var(--color-paper-deep) / <alpha-value>)', // for alternating sections
        surface: 'rgb(var(--color-surface) / <alpha-value>)',  // cards sitting on top of the page

        // ---- Text ----
        ink: 'rgb(var(--color-ink) / <alpha-value>)',      // headings and anything important
        ink2: 'rgb(var(--color-ink2) / <alpha-value>)',    // body text, softer than ink
        muted: 'rgb(var(--color-muted) / <alpha-value>)',  // captions, labels, small print

        // ---- Lines ----
        line: 'rgb(var(--color-line) / <alpha-value>)',              // normal borders
        lineSoft: 'rgb(var(--color-line-soft) / <alpha-value>)',     // dividers inside a card
        lineStrong: 'rgb(var(--color-line-strong) / <alpha-value>)', // the darkest line

        // ---- The one accent: a deep evergreen ----
        // Green reads as growth and money without shouting, and it stays
        // legible on both the pale and the dark sections. On the dark theme it
        // lifts to a mint, because the evergreen would vanish against a near
        // black page. It keeps the same name, so nothing else has to change.
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        accentDeep: 'rgb(var(--color-accent-deep) / <alpha-value>)', // the hover state
        accentSoft: 'rgb(var(--color-accent-soft) / <alpha-value>)', // a pale tint for backgrounds
        mint: 'rgb(var(--color-mint) / <alpha-value>)',              // for use ON the dark sections

        // ---- Brass: the secondary highlight ----
        brass: 'rgb(var(--color-brass) / <alpha-value>)',
        brassSoft: 'rgb(var(--color-brass-soft) / <alpha-value>)',

        // ---- Clay: warnings only, never decoration ----
        clay: 'rgb(var(--color-clay) / <alpha-value>)',
        claySoft: 'rgb(var(--color-clay-soft) / <alpha-value>)',

        // ---- The dark sections ----
        night: 'rgb(var(--color-night) / <alpha-value>)',

        // The cream used for writing on those dark sections. It is a separate
        // name from "paper" because it must NOT flip with the theme: those
        // panels are near-black in both, so their text stays cream in both.
        onNight: 'rgb(var(--color-on-night) / <alpha-value>)',

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

          These take no "<alpha-value>", because nothing draws a chart at half
          opacity and a plain hex is easier to read straight into an SVG.
        */
        chartSpend: 'var(--chart-spend)',          // a cool slate, the counterweight to the warm page
        chartSave: 'var(--chart-save)',            // the theme's brass, deepened for a chart
        chartInvest: 'var(--chart-invest)',        // the theme's evergreen, lifted for a chart
        chartCommitted: 'var(--chart-committed)',  // already spoken for. Context, not a choice.

        /*
          One hue, light to dark, for when the message is "how much" rather than
          "which one". Used for the safety-net meter. The lightest step is not as
          pale as it could be, because it has to stay visible against a white
          card, which is what a decorative tint would fail to do. On the dark
          theme the order flips, because there "more" has to mean brighter.
        */
        chartRamp1: 'var(--chart-ramp-1)',
        chartRamp2: 'var(--chart-ramp-2)',
        chartRamp3: 'var(--chart-ramp-3)',
        chartRamp4: 'var(--chart-ramp-4)',

        // The de-emphasis grey. Every scenario except the one being looked at
        // is drawn in this, so the eye lands on one line rather than four.
        chartMuted: 'var(--chart-muted)',

        // The writing printed inside a coloured chart bar. There are two,
        // because the committed segment is a quiet grey and the other three are
        // strong colours, and no one text colour reads on both. Both flip with
        // the theme, since a fill deep enough to need white text on the light
        // theme is lifted light enough on the dark one to need near-black.
        chartLabel: 'var(--chart-label)',
        chartLabelCommitted: 'var(--chart-label-committed)',
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
        // All three are warm and very soft on the light theme, because hard grey
        // shadows look cheap. The dark theme needs much heavier ones, since a
        // faint shadow is invisible against a near-black page, so these are
        // variables too and both sets live in global.css.
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        float: 'var(--shadow-float)',
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
