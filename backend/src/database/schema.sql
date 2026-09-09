-- Every table in Nest-Worth.
--
-- db.js reads this file and runs it on startup. Every statement says
-- IF NOT EXISTS, so running it again changes nothing.
--
-- SQLite has no boolean and no date type. The convention used throughout is to
-- store a boolean as INTEGER 1 or 0, and a date as TEXT in a format that sorts
-- correctly, such as '2026-08-31' or '2026-08'.


-- People with an account.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL DEFAULT '',

  -- An account has an email OR a phone number, and sometimes both. Whichever
  -- is missing is stored as NULL. UNIQUE stops two accounts sharing one.
  email         TEXT    UNIQUE,
  phone         TEXT    UNIQUE,

  -- NULL for accounts that only ever sign in by phone or with Google,
  -- because those people never chose a password.
  password_hash TEXT,

  -- Google's own id for this person, so we recognise them next time.
  google_id     TEXT    UNIQUE,

  created_at    TEXT    NOT NULL
);


-- One row per signed-in browser. See lib/sessions.js for how this is used.
CREATE TABLE IF NOT EXISTS sessions (
  -- The long random string that lives in the browser's cookie.
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,

  -- If a user is deleted, their sessions go with them.
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- The onboarding answers everything else is calculated from.
CREATE TABLE IF NOT EXISTS households (
  -- One household per user, so the user id IS the key.
  user_id    INTEGER PRIMARY KEY,
  income     INTEGER NOT NULL,
  dependents INTEGER NOT NULL,

  -- SQLite has no true/false type, so we store 1 or 0.
  has_loan   INTEGER NOT NULL,

  -- Whether the income changes month to month, as it does for freelancers and
  -- anyone paid partly on commission. It widens the savings buffer and raises
  -- the emergency fund target, because a bad month is a normal event for these
  -- people rather than an emergency.
  --
  -- DEFAULT 0 matters: it is what an existing row gets when this column is
  -- added to a database that already has households in it. See db.js.
  income_varies INTEGER NOT NULL DEFAULT 0,

  -- Rent, food, transport, bills: what has to be paid before any choice is
  -- made. Without it the plan treats a Mumbai rent and a Nagpur rent as the
  -- same, and asks both to save the same share.
  --
  -- 0 means not answered, which is what an older household gets. See db.js.
  essential_costs INTEGER NOT NULL DEFAULT 0,

  updated_at TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Live six digit codes for phone sign-in. See lib/otp.js.
CREATE TABLE IF NOT EXISTS otp_codes (
  -- Only one live code per phone number, so the number is the key.
  -- Asking for a new code replaces the old one.
  phone      TEXT    PRIMARY KEY,

  -- The code is HASHED, never stored as the six digits themselves. If this
  -- file ever leaked, the codes in it would still be useless.
  code_hash  TEXT    NOT NULL,

  expires_at TEXT    NOT NULL,
  sent_at    TEXT    NOT NULL,

  -- How many wrong guesses have been made against this code.
  attempts   INTEGER NOT NULL DEFAULT 0
);


-- Live "forgot password" links. See lib/passwordReset.js.
-- The same shape as otp_codes, because it is the same idea: a secret that is
-- hashed, expires, and is destroyed the moment it is used.
CREATE TABLE IF NOT EXISTS password_resets (
  -- One live reset per account. Asking again replaces the previous link, which
  -- makes the old one stop working.
  user_id    INTEGER PRIMARY KEY,

  -- Hashed, so a stolen database is not a set of working reset links.
  token_hash TEXT    NOT NULL,

  expires_at TEXT    NOT NULL,
  sent_at    TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What is owed. Half of net worth.
CREATE TABLE IF NOT EXISTS debts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  name        TEXT    NOT NULL,

  -- 'education', 'personal', 'credit_card', 'home', 'vehicle' or 'other'.
  kind        TEXT    NOT NULL DEFAULT 'other',

  -- What is still owed today, not what was originally borrowed.
  principal   REAL    NOT NULL,

  -- Yearly interest as a percentage, so 11.2 means 11.2%.
  annual_rate REAL    NOT NULL,

  -- The fixed amount paid every month.
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

  -- How much has been put aside for this goal so far.
  saved_amount  REAL    NOT NULL DEFAULT 0,

  -- Stored as 'YYYY-MM-DD'. SQLite has no date type, and text in this
  -- format sorts correctly, which is why it is the usual choice.
  target_date   TEXT    NOT NULL,

  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What is owned. The other half of net worth.
CREATE TABLE IF NOT EXISTS assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,

  -- 'cash', 'fd', 'mutual_fund', 'stocks', 'epf', 'gold', 'property', 'other'.
  kind       TEXT    NOT NULL DEFAULT 'other',

  value      REAL    NOT NULL,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- What actually happened each month, as opposed to what the plan said.
CREATE TABLE IF NOT EXISTS checkins (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL,

  -- 'YYYY-MM'. One check-in per month per person, which the UNIQUE line
  -- below enforces: saving the same month again updates it instead.
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



-- Lines read out of a bank statement.
--
-- This is the only table the app does not ask anybody to type. Everything else
-- here is answers to questions; these arrive a few hundred at a time from a CSV
-- and are sorted into categories by lib/categorise.js.
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,

  -- 'YYYY-MM-DD'. Text in a format that sorts correctly, like every other date
  -- in this file, which is what lets one month be found with LIKE '2026-08%'.
  occurred_on TEXT    NOT NULL,

  -- The narration exactly as the bank wrote it. Kept unedited so a category can
  -- be argued with later, and so a new rule can be tried against old rows.
  description TEXT    NOT NULL,

  -- Always a positive number. Which way the money went is in direction, not in
  -- the sign. Storing a negative for money out would mean every SUM has to
  -- remember to flip it, and one that forgets is a wrong total that still looks
  -- like a perfectly good number.
  amount      REAL    NOT NULL,

  -- 'debit' for money leaving, 'credit' for money arriving.
  direction   TEXT    NOT NULL,

  -- One of the keys in shared/categories.js.
  category    TEXT    NOT NULL,

  -- 1 once a person has set the category themselves. A guess is never as good
  -- as being told, and re-running the rules must not overwrite an answer
  -- somebody gave.
  is_confirmed INTEGER NOT NULL DEFAULT 0,

  -- A hash of the date, description, amount, direction and how many identical
  -- lines came before it. See lib/statement.js. The UNIQUE line below is what
  -- makes importing the same statement twice add nothing the second time.
  fingerprint TEXT    NOT NULL,

  created_at  TEXT    NOT NULL,

  UNIQUE (user_id, fingerprint),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



-- The short note on the dashboard that nobody asked for.
--
-- One row per person per day. It is stored rather than worked out on every page
-- load for two reasons: writing it costs a call to a language model, and a
-- coach whose wording changed every time you refreshed would read as noise
-- rather than as a thing that was noticed.
CREATE TABLE IF NOT EXISTS briefings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,

  -- 'YYYY-MM-DD'. One a day, which the UNIQUE line below enforces.
  made_on    TEXT    NOT NULL,

  -- The sentences to show.
  body       TEXT    NOT NULL,

  -- The findings it was written from, as JSON. Kept so the note can be shown
  -- next to the numbers behind it, and so a bad note can be traced back to
  -- whether the detection or the wording was at fault.
  signals    TEXT    NOT NULL,

  -- Which model wrote it, or 'rules' when none was configured and the plain
  -- findings were shown as they are.
  written_by TEXT    NOT NULL,

  created_at TEXT    NOT NULL,

  UNIQUE (user_id, made_on),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
--
-- Nearly every query in this app ends in "WHERE user_id = ?". Without an index
-- SQLite answers that by reading every row in the table and checking each one.
-- With one it jumps straight to that person's rows.
--
-- It makes no difference at two accounts and a great deal at fifty thousand,
-- which is the point of adding it now rather than after somebody complains.
-- The cost is a little extra work on every insert, which is the trade an index
-- always makes.

CREATE INDEX IF NOT EXISTS idx_debts_user     ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user     ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user    ON assets(user_id);

-- checkins needs no index of its own. Its "UNIQUE (user_id, month)" line makes
-- SQLite build one over those two columns already, and a lookup by user_id
-- uses it because user_id is the first column in it. A second index here would
-- be extra work on every write for nothing.

-- Sessions are looked up by token on EVERY request, so this is the hottest
-- lookup in the app. The token is already the primary key, which SQLite indexes
-- on its own. What is missing is the other direction: deleting every session
-- for one user, which happens whenever a password changes.
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);

-- For the startup sweep in db.js, which deletes everything already expired.
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Every screen that reads transactions asks for one person's rows in one month,
-- so this index covers both columns, in that order. user_id has to come first:
-- an index on (occurred_on, user_id) could not answer "this person's rows" on
-- its own, because the column being filtered would not be the leading one. The
-- UNIQUE (user_id, fingerprint) line builds a second index of its own, and that
-- is the one the import checks against.
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, occurred_on);
