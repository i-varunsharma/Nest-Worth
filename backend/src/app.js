import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config.js';
import { isDatabaseHealthy } from './database/db.js';
import { errorHandler, notFoundHandler } from './http/errorHandler.js';
import { attachUser } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import adviceRoutes from './routes/advice.js';
import assetRoutes from './routes/assets.js';
import authRoutes from './routes/auth.js';
import briefingRoutes from './routes/briefing.js';
import checkinRoutes from './routes/checkins.js';
import debtRoutes from './routes/debts.js';
import familyRoutes from './routes/family.js';
import goalRoutes from './routes/goals.js';
import householdRoutes from './routes/household.js';
import insightRoutes from './routes/insights.js';
import recapRoutes from './routes/recap.js';
import scenarioRoutes from './routes/scenarios.js';
import transactionRoutes from './routes/transactions.js';

/*
  Builds the Express app. server.js is what opens a port, which lets the tests
  start the app on a spare port of their own.

  Middleware runs in the order it is added:
    1. log the request (first, so even refused requests are logged)
    2. CORS
    3. read the JSON body and cookies
    4. work out who is signed in
    5. the routes
    6. 404 for anything unmatched, then the error handler
*/

// Statements are a few hundred lines of CSV. Everything else is a short form.
const STATEMENT_BODY_LIMIT = '2mb';
const DEFAULT_BODY_LIMIT = '16kb';


function healthCheck(req, res) {
  // A real query, so the check goes red when the database is unreachable.
  const databaseOk = isDatabaseHealthy();

  let database = 'up';
  if (databaseOk === false) {
    database = 'down';
  }

  const body = {
    ok: databaseOk,
    database: database,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  };

  // 503 is what a load balancer knows to act on.
  if (databaseOk === false) {
    return res.status(503).json(body);
  }

  return res.json(body);
}


// Express 5 leaves req.body undefined when no body was sent. An empty object
// means routes can read req.body.field without checking first.
function ensureBody(req, res, next) {
  if (req.body === undefined) {
    req.body = {};
  }
  next();
}


export function createApp() {
  const app = express();

  app.use(requestLogger);

  // credentials: true lets the browser send the session cookie. It needs one
  // exact origin rather than '*'.
  app.use(cors({ origin: config.clientOrigin, credentials: true }));

  // The larger limit has to be mounted first: whichever parser reads the body
  // first is the one whose limit applies.
  app.use('/api/transactions/import', express.json({ limit: STATEMENT_BODY_LIMIT }));
  app.use(express.json({ limit: DEFAULT_BODY_LIMIT }));
  app.use(ensureBody);
  app.use(cookieParser());

  // Before the routes, because the rate limiter counts signed-in users by id.
  app.use(attachUser);

  app.get('/api/health', healthCheck);

  app.use('/api/auth', authRoutes);
  app.use('/api/household', householdRoutes);
  app.use('/api/family', familyRoutes);
  app.use('/api/debts', debtRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/checkins', checkinRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/insights', insightRoutes);
  app.use('/api/scenarios', scenarioRoutes);
  app.use('/api/briefing', briefingRoutes);
  app.use('/api/recap', recapRoutes);
  app.use('/api/advice', adviceRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
