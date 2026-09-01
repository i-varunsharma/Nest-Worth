import db from '../src/database/db.js';

/*
  Prints everything in the database, so you can see what the app has stored
  without knowing any SQL.

  Run it with:  npm run db:show

  Two things it deliberately never prints: password hashes and session tokens.
  Neither is any use to you while building, and the habit of keeping secrets out
  of terminal output is worth having before it matters. A password hash pasted
  into a screenshot or a support chat is a password hash somebody can attack
  offline, at their leisure.

  For poking around more freely, "npm run db" opens the SQLite shell, and the
  SQLite Viewer extension for VS Code opens the file with a click. See SETUP.md.
*/

// The tables, in the order that makes sense to read them: who, then what they
// told us, then what they own and owe.
const tables = [
  {
    name: 'users',
    title: 'Accounts',
    query: 'SELECT id, name, email, phone, created_at FROM users ORDER BY id',
  },
  {
    name: 'households',
    title: 'Household answers',
    query: `SELECT user_id, income, dependents, has_loan, income_varies,
                   essential_costs
            FROM households ORDER BY user_id`,
  },
  {
    name: 'debts',
    title: 'Debts',
    query: 'SELECT id, user_id, name, kind, principal, annual_rate, emi FROM debts ORDER BY user_id, id',
  },
  {
    name: 'assets',
    title: 'Assets',
    query: 'SELECT id, user_id, name, kind, value FROM assets ORDER BY user_id, id',
  },
  {
    name: 'goals',
    title: 'Goals',
    query: 'SELECT id, user_id, name, target_amount, saved_amount, target_date FROM goals ORDER BY user_id, id',
  },
  {
    name: 'checkins',
    title: 'Monthly check-ins',
    query: 'SELECT id, user_id, month, income, spent, saved, invested FROM checkins ORDER BY user_id, month',
  },
  {
    name: 'sessions',
    title: 'Signed-in browsers',
    // The token itself is the thing that IS the login, so only the count of
    // sessions and when they expire are any of our business here.
    query: 'SELECT user_id, created_at, expires_at FROM sessions ORDER BY user_id',
  },
];

console.log('');

for (const table of tables) {
  const rows = db.prepare(table.query).all();

  console.log('─'.repeat(70));
  console.log('  ' + table.title + '  (' + rows.length + ' rows in ' + table.name + ')');
  console.log('─'.repeat(70));

  if (rows.length === 0) {
    console.log('  nothing here yet');
    console.log('');
    continue;
  }

  // console.table lines the columns up on its own, which is the whole reason
  // for using it rather than printing the rows by hand.
  console.table(rows);
}

console.log('');
console.log('  Database file: backend/data/nestworth.db');
console.log('  Passwords and session tokens are deliberately not shown.');
console.log('');
