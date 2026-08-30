import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
  db.js
  -----
  Opens the database and makes sure the tables exist.

  We use SQLite, which stores the whole database in one file on disk. There is
  no separate database server to install, start or log into, which is why the
  setup steps at the end of this project are so short. It behaves like a real
  SQL database, so everything you learn here carries over to Postgres or MySQL
  later.

  The file lives at backend/data/nestworth.db and is ignored by git, because a
  database full of real people's details should never be committed.
*/

// __dirname does not exist in modern JavaScript modules, so we work it out from
// the current file's address. This is the standard way to do it.
const thisFile = fileURLToPath(import.meta.url);
const thisFolder = path.dirname(thisFile);
const databaseFile = path.join(thisFolder, '..', 'data', 'nestworth.db');

const db = new Database(databaseFile);

// Write-Ahead Logging lets reads carry on while something is being written.
// It is the sensible default for any SQLite database an app is using.
db.pragma('journal_mode = WAL');

/*
  Create the tables if this is the first run.
  "IF NOT EXISTS" means it is safe to run this every time the server starts.
*/
db.exec(`
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

  CREATE TABLE IF NOT EXISTS sessions (
    -- The long random string that lives in the browser's cookie.
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,

    -- If a user is deleted, their sessions go with them.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS households (
    -- One household per user, so the user id IS the key.
    user_id    INTEGER PRIMARY KEY,
    income     INTEGER NOT NULL,
    dependents INTEGER NOT NULL,

    -- SQLite has no true/false type, so we store 1 or 0.
    has_loan   INTEGER NOT NULL,
    updated_at TEXT    NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

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
`);

// Without this, SQLite ignores the FOREIGN KEY lines above. It is off by
// default for backwards compatibility reasons, and has to be asked for.
db.pragma('foreign_keys = ON');

export default db;
