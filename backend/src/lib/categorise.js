/*
  Working out what a bank line was for, from the words in it.

  A statement line looks like this:

    UPI-SWIGGY-SWIGGY@YBL-YESB0000001-4839201-PAYMENT

  There is no category in there. There is a merchant name buried in the middle
  of a routing string, and that is all you get. So the rules below look for
  known names in the text and take the first one that matches.

  ---- Why rules and not an AI ----

  It would be one prompt to hand every line to a language model instead. Rules
  win here for three reasons. They are instant, where a model is a network round
  trip per statement. They cost nothing, and a statement is hundreds of lines.
  And they give the same answer every time, so a person who corrects a category
  once does not see it guessed differently on the next import.

  The trade is that a merchant nobody has written down falls through to "other",
  and the answer is to let people fix it rather than to guess harder. A wrong
  category shown confidently is worse than an honest "everything else".
*/

/*
  The rules, in order. The first one whose word appears in the line wins, so
  the more specific rules have to come first.

  Order is doing real work here. "SBI CARD" is a credit card bill and belongs in
  loan repayments, but it contains the word "CARD" which also appears in the
  bank-charges rule for "CARD FEE". Putting the repayment rule first settles it.

  Everything is compared in upper case, because banks are inconsistent about it
  even within one statement.
*/
const RULES = [
  {
    category: 'income',
    words: ['SALARY', 'SAL CREDIT', 'PAYROLL', 'NEFT CR', 'IMPS CR', 'INTEREST CREDIT', 'REFUND', 'CASHBACK', 'DIVIDEND'],
  },
  {
    category: 'investment',
    words: [
      'ZERODHA', 'GROWW', 'UPSTOX', 'ANGEL ONE', 'ANGELONE', 'KUVERA', 'COIN DCX',
      'MUTUAL FUND', 'MF PURCHASE', 'SIP ', 'NIPPON INDIA', 'ICICI PRU', 'HDFC AMC',
      'AXIS MUTUAL', 'SBI MUTUAL', 'PARAG PARIKH', 'NPS', 'PPF', 'RECURRING DEPOSIT',
      'FIXED DEPOSIT', 'LIC OF INDIA', 'INDMONEY',
    ],
  },
  {
    category: 'emi',
    words: ['EMI', 'LOAN REPAY', 'HOME LOAN', 'CAR LOAN', 'EDUCATION LOAN', 'PERSONAL LOAN',
            'SBI CARD', 'CREDIT CARD PAYMENT', 'CC PAYMENT', 'AUTOPAY CARD', 'BAJAJ FINANCE'],
  },
  {
    category: 'rent',
    words: ['RENT', 'LANDLORD', 'NOBROKER', 'HOUSING SOCIETY', 'MAINTENANCE CHARGE', 'NESTAWAY'],
  },
  {
    category: 'bills',
    words: [
      'AIRTEL', 'JIO', 'VODAFONE', 'VI POSTPAID', 'BSNL', 'ACT FIBERNET', 'HATHWAY',
      'ELECTRICITY', 'BESCOM', 'MSEB', 'TATA POWER', 'ADANI ELECTRIC', 'TORRENT POWER',
      'GAS BILL', 'INDANE', 'HP GAS', 'WATER BILL', 'BROADBAND', 'DTH', 'TATA SKY',
      'RECHARGE', 'BBPS',
    ],
  },
  {
    category: 'groceries',
    words: ['BIGBASKET', 'BLINKIT', 'ZEPTO', 'DMART', 'D MART', 'RELIANCE FRESH', 'MORE RETAIL',
            'GROFERS', 'JIOMART', 'SUPERMARKET', 'KIRANA', 'VEGETABLE', 'MILK'],
  },
  {
    category: 'food',
    words: ['SWIGGY', 'ZOMATO', 'DOMINOS', 'PIZZA', 'MCDONALD', 'KFC', 'BURGER KING',
            'STARBUCKS', 'CAFE', 'RESTAURANT', 'BIRYANI', 'EATERY', 'FOOD', 'CHAI POINT',
            'THIRD WAVE', 'BARBEQUE'],
  },
  {
    category: 'transport',
    words: ['UBER', 'OLA ', 'OLACABS', 'RAPIDO', 'IRCTC', 'REDBUS', 'INDIGO', 'AIR INDIA',
            'VISTARA', 'PETROL', 'FUEL', 'IOCL', 'HPCL', 'BPCL', 'INDIAN OIL', 'FASTAG',
            'METRO', 'BMTC', 'PARKING', 'BLUSMART'],
  },
  {
    category: 'health',
    words: ['APOLLO', 'PHARMEASY', 'NETMEDS', 'TATA 1MG', '1MG', 'PRACTO', 'HOSPITAL',
            'CLINIC', 'DIAGNOSTIC', 'PHARMACY', 'MEDICAL', 'CULT FIT', 'CULTFIT', 'GYM'],
  },
  {
    category: 'education',
    words: ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'TUITION', 'COACHING', 'UDEMY', 'COURSERA',
            'UNACADEMY', 'BYJU', 'VEDANTU', 'EXAM FEE', 'BOOKS'],
  },
  {
    category: 'entertainment',
    words: ['NETFLIX', 'SPOTIFY', 'HOTSTAR', 'PRIME VIDEO', 'SONYLIV', 'ZEE5', 'JIOCINEMA',
            'BOOKMYSHOW', 'PVR', 'INOX', 'YOUTUBE PREMIUM', 'STEAM GAMES', 'PLAYSTATION'],
  },
  {
    category: 'shopping',
    words: ['AMAZON', 'FLIPKART', 'MYNTRA', 'AJIO', 'NYKAA', 'MEESHO', 'TATA CLIQ',
            'DECATHLON', 'IKEA', 'LIFESTYLE', 'PANTALOONS', 'ZARA', 'H AND M', 'CROMA',
            'RELIANCE DIGITAL', 'APPLE STORE'],
  },
  {
    category: 'fees',
    words: ['SERVICE CHARGE', 'ANNUAL FEE', 'CARD FEE', 'GST ON', 'ATM CHARGE',
            'PENALTY', 'LATE FEE', 'MIN BAL', 'SMS CHARGE', 'PROCESSING FEE'],
  },
  {
    category: 'transfer',
    words: ['SELF TRANSFER', 'OWN ACCOUNT', 'ATM WDL', 'ATM CASH', 'CASH WITHDRAWAL',
            'TRANSFER TO', 'FUND TRANSFER'],
  },
];


/*
  Which category a line belongs to.

  direction is 'credit' for money arriving and 'debit' for money leaving.

  The direction is checked first for a reason. Money coming in is income unless
  it is clearly something else, and money going out is never income however the
  line is worded. Without that check a line reading "SALARY ADVANCE REPAYMENT"
  going out of the account would be filed as money coming in, and the month's
  income would be wrong in a way nobody would spot.
*/
export function categorise(description, direction) {
  const text = String(description).toUpperCase();

  for (const rule of RULES) {
    for (const word of rule.words) {
      if (text.includes(word)) {
        /*
          A matched category that contradicts the direction is thrown away.
          The rules read words, and words lie about direction all the time:
          a refund paid out, a "salary account" fee, an investment redemption
          arriving. The sign on the money does not lie.
        */
        if (direction === 'credit' && rule.category !== 'income' && rule.category !== 'transfer' && rule.category !== 'investment') {
          continue;
        }

        if (direction === 'debit' && rule.category === 'income') {
          continue;
        }

        return rule.category;
      }
    }
  }

  // Nothing matched. Money in with no better explanation is income; money out
  // is simply unknown, and says so.
  if (direction === 'credit') {
    return 'income';
  }

  return 'other';
}
