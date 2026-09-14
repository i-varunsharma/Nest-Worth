import db from '../database/db.js';
import { summariseFinances } from '../../../shared/finances.js';
import {
  assetFromRow,
  debtFromRow,
  familyMemberFromRow,
  goalFromRow,
  householdFromRow,
} from './rows.js';

/*
  Reads one person's whole financial picture from the database.

  Anything on the server that needs the plan, the safety net or the stress test
  starts here: the scenarios route and the AI tools. It reads the rows, turns
  them into app shapes with rows.js, and hands them to summariseFinances in
  shared/, the same function the browser uses.

  Every query filters on the user id passed in, which always comes from the
  session cookie and never from anything the browser sent.
*/


/*
  All the stored lists for one person.

  household is null when onboarding was never finished. The lists are empty
  arrays rather than null, so callers can loop over them without checking.
*/
export function readSnapshot(userId) {
  const householdRow = db.prepare('SELECT * FROM households WHERE user_id = ?').get(userId);

  // Highest rate first, the order debts should be cleared in.
  const debtRows = db
    .prepare('SELECT * FROM debts WHERE user_id = ? ORDER BY annual_rate DESC, id ASC')
    .all(userId);

  const goalRows = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC, id ASC')
    .all(userId);

  const assetRows = db
    .prepare('SELECT * FROM assets WHERE user_id = ? ORDER BY id ASC')
    .all(userId);

  const familyRows = db
    .prepare('SELECT * FROM family_members WHERE user_id = ? ORDER BY id ASC')
    .all(userId);

  return {
    household: householdFromRow(householdRow),
    debts: debtRows.map(debtFromRow),
    goals: goalRows.map(goalFromRow),
    assets: assetRows.map(assetFromRow),
    family: familyRows.map(familyMemberFromRow),
  };
}


/*
  The snapshot plus everything worked out from it.

  Returns null when there is no household, since no plan can be built from
  nothing. Callers turn that into a message.
*/
export function readFinances(userId) {
  const snapshot = readSnapshot(userId);

  if (snapshot.household === null) {
    return null;
  }

  const finances = summariseFinances({
    household: snapshot.household,
    debts: snapshot.debts,
    assets: snapshot.assets,
    family: snapshot.family,
  });

  return { snapshot: snapshot, finances: finances };
}
