/*
  Formatting money and dates for the page.

  Everything except greetingForNow comes from shared/format.js, which the server
  also uses, so the AI coach writes "₹13.8 L" exactly the way the page does.
*/
export * from '../../../shared/format.js';


// "Good morning", "Good afternoon" or "Good evening" by the reader's own clock.
// Only the browser needs this, so it is not in shared/.
export function greetingForNow() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}
