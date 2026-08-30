import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/household.js';
import debtRoutes from './routes/debts.js';
import goalRoutes from './routes/goals.js';
import assetRoutes from './routes/assets.js';
import checkinRoutes from './routes/checkins.js';
import { attachUser } from './lib/sessions.js';

/*
  server.js
  ---------
  Starts the API and decides the order things happen in.

  An Express app is a queue of small functions, each of which gets a look at the
  request before passing it along. They run top to bottom in the order they are
  added below, so the order genuinely matters: cookies have to be read before
  anything can work out who is signed in.

  Run it with:  npm run dev
*/

const app = express();

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';


/*
  1. CORS.

  A browser will not let a page on localhost:5173 call an API on localhost:4000
  unless the API says it is allowed. Different port means different origin, as
  far as the browser is concerned.

  credentials: true is the part people miss. Without it the browser will call
  the API happily but refuse to send or store the session cookie, and you get a
  login that silently never sticks.

  Note the origin is one specific address, not "*". A wildcard is not even
  permitted alongside credentials, and for good reason: it would let any website
  on the internet make signed-in requests on your users' behalf.
*/
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));


/*
  2. Read the body of the request.

  Without this, req.body is undefined for every POST. The limit is small on
  purpose: nothing this API accepts is large, so there is no reason to let
  somebody post a hundred megabytes at it.
*/
app.use(express.json({ limit: '16kb' }));


/* 3. Read cookies, so the session token is available as req.cookies. */
app.use(cookieParser());


/*
  4. Work out who is asking.

  This looks up the session cookie and puts the user on req.user, or null. It
  never blocks anything. Individual routes decide whether they need somebody
  signed in.
*/
app.use(attachUser);


/* 5. The actual routes. */
app.use('/api/auth', authRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/checkins', checkinRoutes);


/*
  A tiny health check. Useful for confirming the server is up without opening
  the app, and the first thing to try when the frontend cannot reach it.
*/
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});


/* Anything else is a typo in a URL. */
app.use((req, res) => {
  res.status(404).json({ error: 'No such endpoint: ' + req.method + ' ' + req.path });
});


/*
  The safety net.

  Express hands any error thrown in a route to a function with four arguments,
  and this is that function. Without it, a single unexpected error takes the
  whole server down and the browser just sees the connection drop.

  The real error goes to the terminal for you, and a plain message goes to the
  browser. Sending stack traces to the browser is a gift to anyone poking at
  your app.
*/
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});


app.listen(PORT, () => {
  console.log('');
  console.log('  Nestworth API running');
  console.log('  http://localhost:' + PORT);
  console.log('  allowing requests from ' + CLIENT_ORIGIN);

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('  Google sign-in: not configured (see SETUP.md)');
  }

  console.log('');
});
