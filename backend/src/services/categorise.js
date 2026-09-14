/*
  Works out what a bank line was for from the words in it, for example:

    UPI-SWIGGY-SWIGGY@YBL-YESB0000001-4839201-PAYMENT  ->  food

  Rules rather than a model: they are instant, free, and give the same answer on
  every import, so a category somebody corrected is not guessed differently next
  month. An unknown merchant falls through to "other" for the person to fix.
*/

/*
  The first rule whose word appears in the line wins, so more specific rules come
  first. "SBI CARD" is a card bill and must match before the "CARD FEE" bank
  charge rule. Text is compared in upper case, because banks are inconsistent.
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


// Which category a line belongs to. direction is 'credit' for money arriving and
// 'debit' for money leaving.
export function categorise(description, direction) {
  const text = String(description).toUpperCase();

  for (const rule of RULES) {
    for (const word of rule.words) {
      if (text.includes(word)) {
        // A match that contradicts the direction is discarded. Words can mislead (a refund
        // paid out, a "salary account" fee); the direction of the money cannot.
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
