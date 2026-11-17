/*
  Sends people back to the page they asked for after they sign in.

  When a signed-out person opens /goals, they go to /login?next=%2Fgoals, and
  after signing in they land on /goals instead of the dashboard.
*/

// The login address that remembers where to come back to.
export function loginPathFor(path) {
  return '/login?next=' + encodeURIComponent(path);
}


/*
  Where to go after signing in: the remembered page, or the fallback.

  Only paths inside this site are accepted. "//evil.com" starts with a slash
  too, but a browser reads it as another website, so it is refused. Without
  this check anyone could send a login link that bounces to their own site.
*/
export function pathAfterLogin(fallback) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  if (next === null) {
    return fallback;
  }
  if (next.startsWith('/') === false || next.startsWith('//') === true) {
    return fallback;
  }
  if (next.startsWith('/login') === true) {
    return fallback;
  }

  return next;
}
