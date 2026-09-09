import 'dotenv/config';
import { createApp } from './app.js';
import { closeDatabase } from './database/db.js';
import { log } from './lib/logger.js';
import { describeProvider } from './lib/ai/index.js';

/*
  Starts the API, and stops it properly. Everything about how it behaves while
  running is in app.js.

  Run it with: npm run dev
*/

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// How long to let requests already in flight finish before giving up on them.
const SHUTDOWN_GRACE_MS = 10000;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  Nestworth API running');
  console.log('  http://localhost:' + PORT);
  console.log('  allowing requests from ' + CLIENT_ORIGIN);

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('  Google sign-in: not configured (see SETUP.md)');
  }

  console.log('  AI coach: ' + describeProvider());

  console.log('');
});


/*
  Shutting down without dropping anybody.

  Killing the process is the default and it is rude. Every request being handled
  at that moment dies mid-answer: a browser sees a connection reset rather than
  a result, and a write that was halfway through is halfway through forever.

  This does it in order instead.

    1. Stop accepting new connections. server.close() does exactly this, and no
       more: existing requests carry on to their end.
    2. Wait for those to finish, then close the database so SQLite folds its
       write-ahead log back into the main file.
    3. Exit.

  The timer is the part people leave out. A request that never finishes, one
  waiting on a slow AI answer for instance, would hold the server open forever,
  and a deploy would hang until something killed it harder. After the grace
  period we stop waiting and go anyway. Saying so out loud in the log matters:
  it is the difference between a clean stop and a stop that gave up.

  isStopping guards against the second signal. Pressing Ctrl+C twice while it is
  draining should not start a second shutdown on top of the first.
*/
let isStopping = false;

function shutDown(signal) {
  if (isStopping === true) {
    return;
  }

  isStopping = true;

  log('info', 'Shutting down', { signal: signal });

  const giveUpTimer = setTimeout(() => {
    log('warn', 'Some requests did not finish in time. Exiting anyway.', {
      waitedMs: SHUTDOWN_GRACE_MS,
    });

    closeDatabase();
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  // Without this the timer itself keeps Node alive for the full grace period
  // even when everything has already finished, so a clean stop would still
  // take ten seconds.
  giveUpTimer.unref();

  server.close(() => {
    log('info', 'All requests finished. Closing the database.');

    clearTimeout(giveUpTimer);
    closeDatabase();

    log('info', 'Stopped cleanly.');
    process.exit(0);
  });
}

/*
  SIGTERM is what a host sends when it wants a process to stop: Docker, systemd,
  Heroku, Kubernetes all use it. SIGINT is Ctrl+C in a terminal. Both mean the
  same thing here.
*/
process.on('SIGTERM', () => shutDown('SIGTERM'));
process.on('SIGINT', () => shutDown('SIGINT'));

/*
  A promise that rejected with nobody to catch it.

  Node's default for this is to print a warning and carry on, which leaves the
  server running in a state nobody designed. Logging it loudly is the minimum;
  a bigger deployment would usually stop the process here and let its supervisor
  start a fresh one, on the grounds that a known-good restart beats an unknown
  state.
*/
process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled promise rejection', { reason: String(reason) });
});
