import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/*
  Test settings, kept in their own file rather than inside vite.config.js.

  They are separate for a practical reason. Vite 8 compiles with oxc, while
  Vitest still compiles with esbuild, so the JSX setting below applies to one
  and not the other. Putting it in the shared config makes "npm run dev" print
  a warning about an option it is going to ignore, every single time.

  Run these with:  npm test
*/
export default defineConfig({
  plugins: [react()],

  test: {
    /*
      Tests run in Node, which has no document and no window, so rendering a
      component would fail on the first line. jsdom is a fake browser written
      in JavaScript. It cannot tell you how anything looks, but it can tell you
      what was rendered and what a click does, which is what these tests ask.
    */
    environment: 'jsdom',

    // Runs before every test file. It adds the extra assertions from Testing
    // Library and clears the page between tests.
    setupFiles: ['./tests/setup.js'],

    // Lets test files use test and expect without importing them.
    globals: true,

    include: ['tests/**/*.test.{js,jsx}'],
  },

  /*
    Turn JSX into the "automatic" form, which pulls in what it needs by itself.

    The older "classic" form compiles <div /> into React.createElement(...),
    which only works in a file that has imported React by name. Modern React
    does not need that import, and no file in src/ has it, so without this the
    tests fail with "React is not defined" on every render.
  */
  esbuild: {
    jsx: 'automatic',
  },
});
