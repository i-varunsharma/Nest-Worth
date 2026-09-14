import { useEffect, useState } from 'react';

/*
  Light or dark theme, remembered between visits.

  The choice is written as data-theme="dark" on <html>, and global.css swaps the
  colour variables. It is saved in localStorage so it survives a reload. With no
  saved choice, the operating system's setting is used.
*/

// The key localStorage files it under. Named after the app so it cannot clash
// with anything else on the same address during development.
const STORAGE_KEY = 'nestworth-theme';

// The saved choice, or the operating system's. index.html repeats this before
// React loads, so the page never flashes the wrong theme.
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

// Applies a theme: the attribute the CSS reads, and the phone browser bar colour.
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
  // A function passed to useState runs once, for the starting value only.
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
