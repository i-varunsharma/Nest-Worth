import { config } from '../config.js';

/*
  Writes log lines. JSON in production, so log tools can search and count them.
  Readable text in development.
*/

// Never written to a log, whatever happens. Logs get pasted into tickets and
// kept for years, which makes them the easiest place to leak a secret.
const NEVER_LOG = ['password', 'newPassword', 'currentPassword', 'token', 'credential', 'code'];


export function log(level, message, details) {
  const entry = {
    time: new Date().toISOString(),
    level: level,
    message: message,
  };

  if (details) {
    Object.assign(entry, details);
  }

  if (config.isProduction === true) {
    console.log(JSON.stringify(entry));
    return;
  }

  let line = '  ' + level.padEnd(5) + ' ' + message;

  if (details) {
    const parts = Object.keys(details).map((key) => {
      return key + '=' + details[key];
    });

    if (parts.length > 0) {
      line = line + '  ' + parts.join(' ');
    }
  }

  console.log(line);
}


/* A copy of a request body with secret fields hidden, safe to log. */
export function safeForLogging(body) {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const safe = {};

  for (const key of Object.keys(body)) {
    if (NEVER_LOG.includes(key)) {
      safe[key] = '[hidden]';
    } else {
      safe[key] = body[key];
    }
  }

  return safe;
}
