import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

// Opens the SQLite database, creates missing tables from schema.sql, runs the
// migrations and clears expired rows.

// import.meta.url is this file's own address. Modern JavaScript modules have no
// __dirname, so this is how you work out which folder you are in.
const thisFolder = path.dirname(fileURLToPath(import.meta.url));

// The tests set NESTWORTH_DB_FILE to a temporary file so they never touch the
// database you have been using while building.
let databaseFile = config.databaseFile;

if (!databaseFile) {
  databaseFile = path.join(thisFolder, '..', '..', 'data', 'nestworth.db');
}

// better-sqlite3 will not create a missing folder, so on a fresh clone we have
// to make data/ ourselves.
const dataFolder = path.dirname(databaseFile);

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

const db = new Database(databaseFile);

// Lets reads carry on while something is being written. The usual choice for
// any SQLite database an app is actually using.
db.pragma('journal_mode = WAL');

// Every statement in schema.sql says IF NOT EXISTS, so running the file on
// every startup is safe. Adding a table means editing schema.sql and restarting.
const schema = fs.readFileSync(path.join(thisFolder, 'schema.sql'), 'utf8');

db.exec(schema);

// SQLite ignores FOREIGN KEY unless you ask for it. It is off by default for
// backwards compatibility.
db.pragma('foreign_keys = ON');


/*
  Migrations.

  schema.sql uses IF NOT EXISTS, so it creates tables on a fresh database but never
  changes an existing one. A column added later needs a migration to reach databases
  already in use. This one adds a column when it is missing, which is safe to run on
  every start. A larger project would use numbered migration files.
*/
function addColumnIfMissing(table, column, definition) {
  // Table and column names cannot be ? parameters in SQL. They are written into the
  // string here, which is safe only because they are fixed values from this file.
  const existingColumns = db.prepare('PRAGMA table_info(' + table + ')').all();

  let alreadyThere = false;

  for (const existing of existingColumns) {
    if (existing.name === column) {
      alreadyThere = true;
    }
  }

  if (alreadyThere === true) {
    return;
  }

  db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition);

  console.log('  database: added ' + table + '.' + column);
}

// Added when the plan learned to treat a variable income differently. Existing
// households get 0, meaning a steady income, which is the safe assumption.
addColumnIfMissing('households', 'income_varies', 'INTEGER NOT NULL DEFAULT 0');

// Added when the plan started subtracting fixed living costs before splitting
// what is left. Existing households get 0, which behaves exactly as before.
addColumnIfMissing('households', 'essential_costs', 'INTEGER NOT NULL DEFAULT 0');

// The plan chosen on /plans. No default: NULL means "not chosen", which must stay
// different from somebody who actively chose 'balanced'.
addColumnIfMissing('households', 'chosen_plan', 'TEXT');

/*
  Sessions, codes and reset links are deleted when somebody tries an expired one,
  but rows for people who never come back would stay forever. They are swept at
  startup.
*/
function deleteExpiredRows() {
  const now = new Date().toISOString();

  // Dates are ISO text, which sorts in date order, so a text comparison works.
  const sessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  const codes = db.prepare('DELETE FROM otp_codes WHERE expires_at < ?').run(now);
  const resets = db.prepare('DELETE FROM password_resets WHERE expires_at < ?').run(now);

  const total = sessions.changes + codes.changes + resets.changes;

  if (total > 0) {
    console.log('  database: cleared ' + total + ' expired rows');
  }
}

deleteExpiredRows();


// Used by the health check. A real query, because a deleted file or a full disk
// leaves the connection object looking healthy until something is asked.
export function isDatabaseHealthy() {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
}


/*
  Wraps a function so every statement in it is applied, or none are.

    const move = inTransaction((from, to) => { ... });

  If the function throws, better-sqlite3 rolls back and rethrows. The function must
  not await: SQLite holds the write lock for the whole transaction.
*/
export function inTransaction(work) {
  return db.transaction(work);
}


// Closes the database on shutdown, which folds the write-ahead log back into the
// main file.
export function closeDatabase() {
  db.close();
}


export default db;
