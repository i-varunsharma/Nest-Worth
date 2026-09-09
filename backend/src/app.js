import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/household.js';
import debtRoutes from './routes/debts.js';
import goalRoutes from './routes/goals.js';
import assetRoutes from './routes/assets.js';
import checkinRoutes from './routes/checkins.js';
import adviceRoutes from './routes/advice.js';
import insightRoutes from './routes/insights.js';
import scenarioRoutes from './routes/scenarios.js';
import transactionRoutes from './routes/transactions.js';
import briefingRoutes from './routes/briefing.js';
import recapRoutes from './routes/recap.js';
import { attachUser } from './lib/sessions.js';
import { log, requestLogger, safeForLogging } from './lib/logger.js';
import { isDatabaseHealthy } from './database/db.js';

/*
  Builds the Express app and returns it. server.js is what opens a port.

  Keeping the two apart lets the tests start the app on a spare port without
  going near the real server.

  An Express app is a list of small functions that each get a look at the
  request before passing it on. They run in the order they are added below, so
  the order matters: cookies have to be read before we can tell who is signed in.
*/

export function createApp() {
  const app = express();

  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  /*
    A browser will not let a page on port 5173 call an API on port 4000 unless
    the API says it is allowed. Different port means different origin.

    credentials: true is the part people miss. Without it the request goes
    through but the session cookie is left behind, and the login never sticks.
    It cannot be used with origin: '*', which is why one exact address is named.
  */
  /*
    The logger goes first, before anything can refuse a request.

    Order matters here more than it looks. Below CORS, a request rejected by
    CORS would never be logged, and "the browser says CORS but the server shows
    nothing" is one of the harder afternoons in web development.
  */
  app.use(requestLogger);

  app.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }));

  /*
    One route accepts something large: a bank statement, which is a few hundred
    lines of CSV. Everything else on this API is a short form, so the general
    limit below stays small and this one exception is named out loud.

    It has to be mounted BEFORE the general parser. Body parsers mark a request
    as read once they have read it and later ones leave it alone, so whichever
    runs first is the one whose limit applies. The other way round, the 16kb
    parser would reject a statement before this line was ever reached.
  */
  app.use('/api/transactions/import', express.json({ limit: '2mb' }));

  // Without this, req.body is undefined on every POST. The limit is small
  // because nothing else this API accepts is large.
  app.use(express.json({ limit: '16kb' }));

  app.use(cookieParser());

  // Puts the signed-in user on req.user, or null. It blocks nothing; routes
  // that need somebody signed in say so themselves with requireUser.
  //
  // It has to run before the routes because the rate limiter counts a
  // signed-in person by their user id rather than their IP address.
  app.use(attachUser);

  app.use('/api/auth', authRoutes);
  app.use('/api/household', householdRoutes);
  app.use('/api/debts', debtRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/checkins', checkinRoutes);
  app.use('/api/advice', adviceRoutes);
  app.use('/api/insights', insightRoutes);
  app.use('/api/scenarios', scenarioRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/briefing', briefingRoutes);
  app.use('/api/recap', recapRoutes);

  /*
    Is this server actually working?

    It used to answer ok: true without checking anything, which meant it stayed
    green while the database was missing. A health check that cannot go red is
    decoration: the whole point is that something watching it restarts the
    server or stops sending it traffic, and it can only do that if the check
    tells the truth.

    So it runs a real query. 503 means "up but not able to work", which is the
    honest answer and the one a load balancer knows how to act on.
  */
  app.get('/api/health', (req, res) => {
    const databaseOk = isDatabaseHealthy();

    const body = {
      ok: databaseOk,
      database: databaseOk ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };

    if (databaseOk === false) {
      return res.status(503).json(body);
    }

    return res.json(body);
  });

  // Anything that reached here is a typo in a URL.
  app.use((req, res) => {
    res.status(404).json({ error: 'No such endpoint: ' + req.method + ' ' + req.path });
  });

  /*
    Express sends any error thrown in a route to a function with four
    arguments, and this is it. The real error goes to our terminal; the browser
    gets a plain message, because stack traces help whoever is attacking you.

    The fourth argument has to stay even though nothing uses it. Express counts
    the arguments to decide this is an error handler, and with three it becomes
    ordinary middleware that never runs. The underscore is the usual way of
    saying "deliberately unused", and it is what stops the linter flagging it.
  */
  app.use((error, req, res, _next) => {
    /*
      The request id ties this to the line the logger already wrote for the
      same request, so a stack trace and its timing are findable together.

      It goes back to the browser too. "Something went wrong" is useless in a
      bug report; "something went wrong, reference 4f2a9c1b" is a line you can
      search the logs for.
    */
    log('error', 'Unhandled error', {
      id: req.id,
      path: req.originalUrl,
      message: error.message,
      body: JSON.stringify(safeForLogging(req.body)),
    });

    console.error(error);

    res.status(500).json({
      error: 'Something went wrong on our side.',
      requestId: req.id,
    });
  });

  return app;
}
