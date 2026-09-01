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
import { attachUser } from './lib/sessions.js';

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
  app.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }));

  // Without this, req.body is undefined on every POST. The limit is small
  // because nothing this API accepts is large.
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

  // Handy for checking the server is up without opening the app.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // Anything that reached here is a typo in a URL.
  app.use((req, res) => {
    res.status(404).json({ error: 'No such endpoint: ' + req.method + ' ' + req.path });
  });

  /*
    Express sends any error thrown in a route to a function with four
    arguments, and this is it. The real error goes to our terminal; the browser
    gets a plain message, because stack traces help whoever is attacking you.

    "next" is unused but has to stay. Express counts the arguments to decide
    this is an error handler, and with three it becomes ordinary middleware
    that never runs.
  */
  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Something went wrong on our side.' });
  });

  return app;
}
