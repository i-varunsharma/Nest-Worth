import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/*
  Runs before every test file.

  Two things happen here.

  The import on the first line adds extra assertions to expect(), the ones that
  know about the page rather than about plain values: toBeInTheDocument,
  toBeDisabled, toHaveTextContent and so on. Without it, expect() only knows how
  to compare numbers and strings.

  The cleanup below throws away whatever a test rendered once it has finished.
  Skip it and every test after the first is looking at a page with all the
  earlier tests' components still on it, and a search for "Save" starts finding
  three buttons instead of one.
*/
afterEach(() => {
  cleanup();
});
