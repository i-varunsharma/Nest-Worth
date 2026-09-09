import { useEffect, useState } from 'react';

/*
  Light theme or dark theme, remembered between visits.

  How it works, in one line: the choice is written as data-theme="dark" on the
  <html> tag, and global.css swaps every colour variable when it sees it.

  The choice is kept in localStorage, which is a small store the browser keeps
  per site and does not clear when the tab closes. That is the whole reason
  the setting survives a refresh. It cannot be kept in React state alone,
  because state is thrown away the moment the page reloads.

  Somebody who has never touched the switch gets whatever their computer is set
  to. Guessing light for a person whose whole machine is dark is the wrong
  guess, and it is the first thing they see.
*/

// The key localStorage files it under. Named after the app so it cannot clash
// with anything else on the same address during development.
const STORAGE_KEY = 'nestworth-theme';

/*
  Read the saved choice, or fall back to the operating system.

  This lives outside the component because index.html needs the same answer
  before React has even loaded, and it is safer to have the logic written down
  once here as the thing the app agrees with.
*/
export function readStoredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  // matchMedia asks the browser a CSS question from JavaScript. This one is
  // "is the operating system set to dark mode".
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (prefersDark === true) {
    return 'dark';
  }

  return 'light';
}

/*
  Put a theme into effect: the attribute the CSS reads, and the browser bar
  colour on a phone, which is the strip above the page and looks wrong if it
  stays cream while everything below it goes black.
*/
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const themeColourTag = document.querySelector('meta[name="theme-color"]');

  if (themeColourTag) {
    if (theme === 'dark') {
      themeColourTag.setAttribute('content', '#131210');
    } else {
      themeColourTag.setAttribute('content', '#F7F4EF');
    }
  }
}

export default function useTheme() {
  /*
    The starting value is worked out by the function passed to useState rather
    than by calling readStoredTheme() directly. Written the direct way, that
    function would run on every single render and the answer would be thrown
    away every time except the first. This way React only calls it once.
  */
  const [theme, setTheme] = useState(() => {
    return readStoredTheme();
  });

  // Whenever the choice changes, write it to the page and to storage.
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return [theme, toggleTheme];
}
