import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
  Opens the SQLite database and creates the tables if they are missing.

  SQLite keeps the whole database in one file, so there is no database server to
  install or start. The tables themselves are defined in schema.sql next door.
*/

// import.meta.url is this file's own address. Modern JavaScript modules have no
// __dirname, so this is how you work out which folder you are in.
const thisFolder = path.dirname(fileURLToPath(import.meta.url));

// The tests set NESTWORTH_DB_FILE to a temporary file so they never touch the
// database you have been using while building.
let databaseFile = process.env.NESTWORTH_DB_FILE;

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

  Running schema.sql covers a fresh database, but every statement in it says
  IF NOT EXISTS, which means it does nothing at all to a table that already
  exists. So adding a column to schema.sql updates new installs and quietly
  skips everybody who has been using the app already.

  That is the thing to understand about database changes: the schema file
  describes where you want to be, and a migration is how a database that is
  already in use gets there.

  This one adds a column when it is missing, which is safe to run on every
  startup. A larger project would keep numbered migration files and a record of
  which have run; at this size, checking what is actually there is simpler and
  harder to get wrong.
*/
function addColumnIfMissing(table, column, definition) {
  /*
    PRAGMA table_info lists the columns a table actually has right now.

    The table and column names are written straight into the SQL here rather
    than passed as ? parameters. That is normally the thing you must never do,
    but SQL does not allow a parameter in place of a name, and these values are
    fixed strings written below rather than anything a user typed.
  */
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

/*
  Throwing away what has expired.

  Three tables hold things with a deadline: sessions, one-time codes and reset
  links. Each of them is checked when somebody tries to use it, and deleted then
  if it has run out. That is what keeps them secure.

  What it does not do is clean up after everybody who never came back. A phone
  number that asks for a code and never types it leaves its row behind forever,
  and so does every session belonging to somebody who signed in a year ago and
  moved on. None of those rows can be used, they just sit there.

  Running this at startup is enough at this size. A busier app would run it on a
  timer instead, or let SQLite do it, but "clean up when the server restarts" is
  simple, obvious, and cannot fire at a bad moment.
*/
function deleteExpiredRows() {
  const now = new Date().toISOString();

  // The dates are stored as ISO text, which sorts in date order, so a plain
  // text comparison is also a date comparison. That is why they are stored
  // that way round.
  const sessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  const codes = db.prepare('DELETE FROM otp_codes WHERE expires_at < ?').run(now);
  const resets = db.prepare('DELETE FROM password_resets WHERE expires_at < ?').run(now);

  const total = sessions.changes + codes.changes + resets.changes;

  if (total > 0) {
    console.log('  database: cleared ' + total + ' expired rows');
  }
}

deleteExpiredRows();


/*
  Is the database actually usable right now?

  Used by the health check. It runs a real query rather than checking a flag,
  because the interesting failures are the ones a flag would miss: the file
  deleted underneath a running server, a disk that has filled up, permissions
  changed. In every one of those the connection object still looks perfectly
  healthy and the first real query throws.

  The query is deliberately trivial. This is asking "can you answer at all",
  not "are you fast", and a health check that does real work becomes a way to
  put a struggling server under more load at exactly the wrong moment.
*/
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
  Runs several statements as one all-or-nothing unit.

    const move = inTransaction((from, to, amount) => {
      takeFrom(from, amount);
      giveTo(to, amount);
    });

  Without this, a crash between two writes leaves the database in a state that
  should never have existed: the money taken out of one place and never put into
  the other. A transaction means the database either applies every statement or
  none of them, so there is no halfway.

  better-sqlite3 does the work; this wraps it so there is one obvious place to
  find the explanation. Two things it does that are easy to miss:

  It rolls back automatically. If the function throws, everything the function
  did is undone and the error carries on up to the caller. There is no need to
  remember a rollback, which is the step people forget.

  It is synchronous, and it has to be. Nothing inside may await. SQLite holds
  the write lock for the whole transaction, and an await would hand control back
  to Node in the middle of it, letting another request try to write while this
  one is halfway done.
*/
export function inTransaction(work) {
  return db.transaction(work);
}


/*
  Closes the database cleanly. Called on the way down. See server.js.

  SQLite is running in WAL mode, which means recent writes live in a separate
  -wal file until they are folded back into the main one. Closing properly does
  that folding. Killing the process instead leaves the -wal file behind: not
  lost, because SQLite recovers it on the next open, but the next start is
  slower and a copy of the .db file taken in that state is incomplete.
*/
export function closeDatabase() {
  db.close();
}


export default db;
