/*
  The networth maths lives in shared/networth.js at the top of the project, and this file
  passes it straight through.

  It moved there when the AI coach started calling these same functions. The
  browser draws the dashboard with them and the server hands them to Claude as
  tools, and two copies would eventually disagree: the page would show one
  payoff date and the coach would say another, and there would be no way to
  tell which was right.

  Every import in the app still says '../lib/networth', so nothing else had to change.
*/
export * from '../../../shared/networth.js';
