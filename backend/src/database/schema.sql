-- Every table in Nest-Worth.
--
-- database/db.js runs this file on startup. Each statement says IF NOT EXISTS,
-- so running it again changes nothing. Changes to existing tables need a
-- migration in db.js.
--
-- SQLite has no boolean or date types: booleans are INTEGER 1 or 0, and dates
-- are TEXT in a format that sorts correctly, such as '2026-08-31' or '2026-08'.
--
-- Every table that belongs to a user has ON DELETE CASCADE on user_id, so
-- deleting an account deletes everything in it. tests/database.test.js checks
-- that rule, and an index on user_id, for every such table.


-- Accounts.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL DEFAULT '',

  -- An account has an email, a phone, or both. UNIQUE stops two accounts sharing one.
  email         TEXT    UNIQUE,
  phone         TEXT    UNIQUE,

  -- NULL for accounts that only sign in by phone or Google.
  password_hash TEXT,

  -- Google's id for this person, to recognise them next time.
  google_id     TEXT    UNIQUE,

  created_at    TEXT    NOT NULL
);


-- One row per signed-in browser. See services/sessionService.js.
CREATE TABLE IF NOT EXISTS sessions (
  -- The random token stored in the browser's cookie.
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- The onboarding answers the plan is built from. One per user.
CREATE TABLE IF NOT EXISTS households (
  user_id    INTEGER PRIMARY KEY,
  income     INTEGER NOT NULL,

  -- Used only until the Family page has people on it.
  dependents INTEGER NOT NULL,

  has_loan   INTEGER NOT NULL,

  -- 1 for freelance or commission income. Widens the savings buffer.
  income_varies INTEGER NOT NULL DEFAULT 0,

  -- Rent, food, transport and bills. 0 means not answered.
  essential_costs INTEGER NOT NULL DEFAULT 0,

  updated_at TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Live phone sign-in codes, one per number. Only a hash of the code is stored.
CREATE TABLE IF NOT EXISTS otp_codes (
  phone      TEXT    PRIMARY KEY,
  code_hash  TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  sent_at    TEXT    NOT NULL,

  -- Wrong guesses so far.
  attempts   INTEGER NOT NULL DEFAULT 0
);


-- Live password reset links, one per account. Only a hash of the token is stored.
CREATE TABLE IF NOT EXISTS password_resets (
  user_id    INTEGER PRIMARY KEY,
  token_hash TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  sent_at    TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What is owed.
CREATE TABLE IF NOT EXISTS debts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  name        TEXT    NOT NULL,

  -- 'education', 'personal', 'credit_card', 'home', 'vehicle' or 'other'.
  kind        TEXT    NOT NULL DEFAULT 'other',

  -- What is still owed today, not what was borrowed.
  principal   REAL    NOT NULL,

  -- Yearly interest as a percentage: 11.2 means 11.2%.
  annual_rate REAL    NOT NULL,

  emi         REAL    NOT NULL,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What is being saved for.
CREATE TABLE IF NOT EXISTS goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  name          TEXT    NOT NULL,
  target_amount REAL    NOT NULL,
  saved_amount  REAL    NOT NULL DEFAULT 0,

  -- 'YYYY-MM-DD'.
  target_date   TEXT    NOT NULL,

  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What is owned.
CREATE TABLE IF NOT EXISTS assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,

  -- 'cash', 'fd', 'mutual_fund', 'stocks', 'epf', 'gold', 'property' or 'other'.
  kind       TEXT    NOT NULL DEFAULT 'other',

  value      REAL    NOT NULL,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- The people this salary supports. Once any exist, the plan uses their real
-- amounts instead of estimating from households.dependents.
CREATE TABLE IF NOT EXISTS family_members (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  name            TEXT    NOT NULL,

  -- 'parent', 'spouse', 'child', 'sibling', 'grandparent' or 'other'.
  relation        TEXT    NOT NULL DEFAULT 'other',

  -- Money sent or spent on them in a normal month. 0 is allowed.
  monthly_support REAL    NOT NULL DEFAULT 0,

  -- 1 if they have health insurance. Used by the stress test's hospital bill.
  has_health_cover INTEGER NOT NULL DEFAULT 0,

  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What actually happened each month. Saving a month again updates it.
CREATE TABLE IF NOT EXISTS checkins (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL,

  -- 'YYYY-MM'.
  month    TEXT    NOT NULL,

  income   REAL    NOT NULL,
  spent    REAL    NOT NULL,
  saved    REAL    NOT NULL,
  invested REAL    NOT NULL,
  note     TEXT    NOT NULL DEFAULT '',

  created_at TEXT  NOT NULL,

  UNIQUE (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Lines read from bank statements. See services/statementParser.js.
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,

  -- 'YYYY-MM-DD', so one month can be found with LIKE '2026-08%'.
  occurred_on TEXT    NOT NULL,

  -- The narration exactly as the bank wrote it.
  description TEXT    NOT NULL,

  -- Always positive. The direction says which way it went, so no SUM has to
  -- remember to flip a sign.
  amount      REAL    NOT NULL,

  -- 'debit' for money leaving, 'credit' for money arriving.
  direction   TEXT    NOT NULL,

  -- A key from shared/categories.js.
  category    TEXT    NOT NULL,

  -- 1 once a person has set the category. Re-running the rules must not overwrite it.
  is_confirmed INTEGER NOT NULL DEFAULT 0,

  -- A hash that identifies the line. UNIQUE makes re-importing a statement add nothing.
  fingerprint TEXT    NOT NULL,

  created_at  TEXT    NOT NULL,

  UNIQUE (user_id, fingerprint),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- The daily dashboard note. One per user per day.
CREATE TABLE IF NOT EXISTS briefings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,

  -- 'YYYY-MM-DD'.
  made_on    TEXT    NOT NULL,

  body       TEXT    NOT NULL,

  -- The findings it was written from, as JSON, to trace a bad note to its cause.
  signals    TEXT    NOT NULL,

  -- The model that wrote it, or 'rules' when none was configured.
  written_by TEXT    NOT NULL,

  created_at TEXT    NOT NULL,

  UNIQUE (user_id, made_on),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
-- Nearly every query filters on user_id. Without an index SQLite reads every
-- row in the table to answer it.

CREATE INDEX IF NOT EXISTS idx_debts_user     ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user     ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user    ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_family_user    ON family_members(user_id);

-- checkins, transactions and briefings need no separate user_id index: their
-- UNIQUE constraints start with user_id and SQLite uses those.

-- Deleting every session for one user happens on each password change.
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);

-- For the startup sweep of expired sessions in db.js.
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Every transaction screen reads one user's rows for one month.
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, occurred_on);
