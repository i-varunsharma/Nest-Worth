import 'dotenv/config';
import { createApp } from './app.js';

/*
  Starts the API. Everything about how it behaves is in app.js.

  Run it with: npm run dev
*/

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = createApp();

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
