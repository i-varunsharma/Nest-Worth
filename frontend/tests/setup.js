import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/*
  Runs before every test file.

  Four things happen here.

  The import on the first line adds extra assertions to expect(), the ones that
  know about the page rather than about plain values: toBeInTheDocument,
  toBeDisabled, toHaveTextContent and so on. Without it, expect() only knows how
  to compare numbers and strings.

  The matchMedia stub below fills in a browser function jsdom does not have.
  jsdom is a fake browser: it understands the page but has no window to draw it
  in, so questions about the screen have no answer there and the function is
  simply missing. Anything that asks it, the theme toggle and the count-up
  numbers here, would crash in tests while working perfectly in a real browser.
  The stub answers "no" to every question, which gives tests the light theme and
  full animation, the same as a plain default machine.

  The IntersectionObserver stub fills in another one jsdom does not have, for
  the same reason: it answers "has this scrolled into view", and there is no
  view to scroll. It reports straight away that the element IS visible, which is
  the state the tests care about. Anything drawn by useReveal is held at nothing
  until it is seen, so without this every bar and every chart line would be
  measured at zero width and the tests would be checking the wrong picture.

  The cleanup at the bottom throws away whatever a test rendered once it has
  finished. Skip it and every test after the first is looking at a page with all
  the earlier tests' components still on it, and a search for "Save" starts
  finding three buttons instead of one.
*/
window.matchMedia = (query) => {
  return {
    matches: false,
    media: query,

    // Nothing in the app uses these, but the real matchMedia has them and code
    // that checks before calling one would otherwise take the wrong branch.
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => {
      return false;
    },
  };
};

window.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback;
  }

  observe(element) {
    // Report it as on screen immediately. The real one waits for a scroll; in a
    // test there is nothing to wait for, and the finished state is the one
    // worth checking.
    this.callback([{ target: element, isIntersecting: true }]);
  }

  unobserve() {}

  disconnect() {}
};

afterEach(() => {
  cleanup();
});
