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

export default db;
