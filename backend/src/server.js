import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './database/db.js';
import { describeProvider } from './ai/providers/index.js';
import { log } from './utils/logger.js';

/*
  Starts the API and shuts it down cleanly. Run with: npm run dev

  On SIGTERM (sent by a host during a deploy) or SIGINT (Ctrl+C):
    1. stop accepting new connections
    2. let requests already in flight finish
    3. close SQLite so its write-ahead log is folded back into the main file
  A request that never finishes, such as a slow AI answer, is given up on after
  the grace period so a deploy cannot hang.
*/

const SHUTDOWN_GRACE_MS = 10000;

const server = createApp().listen(config.port, () => {
  console.log('');
  console.log('  Nestworth API running');
  console.log('  http://localhost:' + config.port);
  console.log('  allowing requests from ' + config.clientOrigin);

  if (!config.googleClientId) {
    console.log('  Google sign-in: not configured (see SETUP.md)');
  }

  console.log('  AI coach: ' + describeProvider());
  console.log('');
});

let isStopping = false;

function shutDown(signal) {
  // A second Ctrl+C while draining should not start a second shutdown.
  if (isStopping === true) {
    return;
  }

  isStopping = true;
  log('info', 'Shutting down', { signal: signal });

  const giveUpTimer = setTimeout(() => {
    log('warn', 'Some requests did not finish in time. Exiting anyway.', { waitedMs: SHUTDOWN_GRACE_MS });
    closeDatabase();
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  // Without unref the timer itself would keep Node running for the full grace period.
  giveUpTimer.unref();

  server.close(() => {
    clearTimeout(giveUpTimer);
    closeDatabase();
    log('info', 'Stopped cleanly.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => {
  shutDown('SIGTERM');
});

process.on('SIGINT', () => {
  shutDown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled promise rejection', { reason: String(reason) });
});
