import { transactionRepository } from '../repositories/transactionRepository.js';
import { parseStatement } from './statementParser.js';
import { badRequest } from '../http/errors.js';
import { isSpending } from '../../../shared/categories.js';

/*
  Importing bank statements and adding a month up.
*/


/* Parses and saves a statement. Returns { added, alreadyHad, unreadableLines, months }. */
export function importStatement(userId, csv) {
  if (typeof csv !== 'string' || csv.trim().length === 0) {
    throw badRequest('Send the contents of the CSV file.');
  }

  const parsed = parseStatement(csv);

  if (parsed.error) {
    throw badRequest(parsed.error);
  }

  const added = transactionRepository.importRows(userId, parsed.rows);

  // The months this file touched, so the page can jump to one.
  const months = [];

  for (const row of parsed.rows) {
    const month = row.occurredOn.slice(0, 7);

    if (months.includes(month) === false) {
      months.push(month);
    }
  }

  months.sort();

  return {
    added: added,
    alreadyHad: parsed.rows.length - added,
    unreadableLines: parsed.skipped,
    months: months,
  };
}


/*
  One month, added up by category.

  "spent" counts spending categories only. A SIP or a transfer to savings also
  leaves the account, but counting it as spending would call the month somebody
  saved most their worst month. Investments are reported as putAway instead.
*/
export function summariseMonth(userId, month) {
  const totals = transactionRepository.totalsByCategory(userId, month);

  let income = 0;
  let spent = 0;
  let putAway = 0;
  const categories = [];

  for (const row of totals) {
    if (row.direction === 'credit' && row.category === 'income') {
      income = income + row.total;
    }

    if (row.direction === 'debit' && isSpending(row.category) === true) {
      spent = spent + row.total;
      categories.push({ key: row.category, total: row.total, lines: row.lines });
    }

    if (row.direction === 'debit' && row.category === 'investment') {
      putAway = putAway + row.total;
    }
  }

  // Share of spending for each category. A month with no spending divides by 1.
  let spendingForShare = spent;
  if (spendingForShare <= 0) {
    spendingForShare = 1;
  }

  categories.forEach((entry) => {
    entry.share = (entry.total / spendingForShare) * 100;
  });

  return {
    month: month,
    income: income,
    spent: spent,
    putAway: putAway,
    kept: income - spent,
    lines: transactionRepository.countLines(userId, month),
    needingAttention: transactionRepository.countUnreviewed(userId, month),
    categories: categories,
  };
}
