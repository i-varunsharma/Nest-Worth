/*
  Every setting the server reads from the environment, in one place.

  Each value is a getter, so it is read from process.env when it is used rather
  than once at startup. The tests change environment variables before loading
  the app, and a getter always sees the current value.

  backend/.env.example documents what each setting does.
*/

const DEFAULT_PORT = 4000;
const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

export const config = {
  get port() {
    return Number(process.env.PORT) || DEFAULT_PORT;
  },

  // The address the React app is served from. Used for CORS and reset links.
  get clientOrigin() {
    return process.env.CLIENT_ORIGIN || DEFAULT_CLIENT_ORIGIN;
  },

  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  // Empty means use backend/data/nestworth.db.
  get databaseFile() {
    return process.env.NESTWORTH_DB_FILE || '';
  },

  // Only the test suite sets this. See middleware/rateLimit.js.
  get isRateLimitDisabled() {
    return process.env.DISABLE_RATE_LIMIT === 'true';
  },

  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID || '';
  },

  get ai() {
    return {
      provider: process.env.AI_PROVIDER || '',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      geminiModel: process.env.GEMINI_MODEL || '',
      geminiBaseUrl: process.env.GEMINI_BASE_URL || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      anthropicModel: process.env.ANTHROPIC_MODEL || '',
    };
  },
};
