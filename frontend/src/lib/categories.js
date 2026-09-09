/*
  The transaction categories live in shared/categories.js at the top of the
  project, and this file passes them straight through.

  They are shared because the server decides which category a statement line
  falls into and refuses to store anything not on the list, while the browser
  draws a dropdown of the same list so a wrong guess can be corrected. Two
  copies of a list like that stay in step for about a week.

  Same shape as lib/debt.js and the others next to it, so every import in the
  app reads '../lib/categories'.
*/
export * from '../../../shared/categories.js';
