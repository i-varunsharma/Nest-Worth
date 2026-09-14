import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { SAMPLE_STATEMENT } from '../src/lib/sampleStatement.js';

/*
  Opens the app in a real browser, at three screen sizes, and saves pictures.

  Run it with:  npm run shots

  This exists because the component tests cannot see. They run in jsdom, which
  has no layout engine: it can say a legend was rendered and that no width came
  out as NaN, and it cannot say that a label was cut in half or that a chart
  became six pixels tall on a phone. Both of those were really here, and both
  were found by looking at the output of this script rather than by a test.

  It also reports two things that are hard to notice by eye:

    horizontal overflow, which is the classic responsive failure. A page wider
    than the screen means somebody on a phone has to drag sideways to read it.

    text that is clipped by its own box, found by comparing how wide each piece
    of text wants to be against how much room it was given.

  ---------------------------------------------------------------
  It never touches your real database.
  ---------------------------------------------------------------

  It starts its own API on port 4001 against a throwaway SQLite file, with the
  rate limiters off, exactly the way the test suite does. Screenshots need a
  fresh account with known numbers every run, and doing that against the real
  database would fill it with fake people and trip the sign-up limiter, which
  is what it is there for.

  Start the two dev servers it drives first:

      cd frontend && VITE_API_URL=http://localhost:4001 npx vite --port 5174
      cd backend  && NESTWORTH_DB_FILE=/tmp/nestworth-shots.db \
                     DISABLE_RATE_LIMIT=true PORT=4001 \
                     CLIENT_ORIGIN=http://localhost:5174 npm start
*/

const API = process.env.SHOT_API || 'http://localhost:4001';
const WEB = process.env.SHOT_WEB || 'http://localhost:5174';

const OUT = path.join(process.cwd(), 'screenshots');

// The pages worth looking at, and what has to be on screen before the picture
// is taken. Without that wait the screenshot catches the loading state.
const PAGES = [
  { path: '/plans', waitFor: 'The same money' },
  { path: '/dashboard', waitFor: 'Your coach' },
  { path: '/family', waitFor: 'Share of income' },
  { path: '/stress-test', waitFor: 'What would help' },
  { path: '/spending', waitFor: 'Where it went' },
  { path: '/recap', waitFor: 'Came in' },
];

const SIZES = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'laptop', width: 1024, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

/*
  Both themes, every time.

  The dark theme is not a filter over the light one. Every colour in it was
  chosen separately, so it can break on its own: text that vanishes into its own
  background, a shadow that was doing the work of a border and is now invisible,
  a chart label printed on a fill it no longer contrasts with. All three of
  those happened while it was being built, and none of them is a thing the
  component tests can see.
*/
const THEMES = ['light', 'dark'];

const account = {
  name: 'Screenshot Test',
  email: 'shots@example.com',
  password: 'a-long-enough-password',
};


/* One request to the throwaway API, carrying the session cookie along. */
async function call(endpoint, method, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(API + endpoint, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = response.headers.get('set-cookie');

  return {
    status: response.status,
    data: await response.json(),
    cookie: setCookie ? setCookie.split(';')[0] : null,
  };
}


/*
  Makes the account the screenshots are taken of.

  The numbers are fixed rather than random, because a picture is only worth
  comparing with last week's if the data behind it has not moved. This
  household has an expensive credit card and a cheap education loan, which is
  what makes the plans page show something worth looking at.
*/
async function seed() {
  let session = await call('/api/auth/signup', 'POST', account);

  // Already there from a previous run against the same file.
  if (!session.cookie) {
    session = await call('/api/auth/login', 'POST', account);
  }

  const cookie = session.cookie;

  if (!cookie) {
    throw new Error('Could not sign in to the screenshot API. Is it running on ' + API + '?');
  }

  await call('/api/household', 'PUT', {
    income: 85000,
    dependents: 2,
    hasLoan: true,
    incomeVaries: false,
    essentialCosts: 24000,
  }, cookie);

  /*
    The statement, so the spending and recap pages have something on them.

    It is the same sample the import box offers, which means these pictures show
    what somebody actually sees when they press "try a sample month" rather than
    a set of numbers invented only for the screenshots.

    Importing it twice adds nothing the second time, so unlike the debts below
    this needs no guard: that is the whole point of the fingerprint.
  */
  await call('/api/transactions/import', 'POST', { csv: SAMPLE_STATEMENT }, cookie);

  // Adding these twice would double the debts and quietly change every figure
  // on the page, so an existing list is left alone.
  const existing = await call('/api/debts', 'GET', null, cookie);

  if (existing.data.debts.length === 0) {
    await call('/api/debts', 'POST', {
      name: 'HDFC Credit Card', kind: 'credit_card',
      principal: 84000, annualRate: 42, emi: 4000,
    }, cookie);

    await call('/api/debts', 'POST', {
      name: 'Education loan', kind: 'education',
      principal: 410000, annualRate: 8.4, emi: 7200,
    }, cookie);

    await call('/api/assets', 'POST', {
      name: 'HDFC Savings', kind: 'cash', value: 95000,
    }, cookie);
  }

  // Two people, one without health cover, so the family page shows its warning
  // and the stress test has somebody to send the hospital bill to.
  const family = await call('/api/family', 'GET', null, cookie);

  if (family.data.family.length === 0) {
    await call('/api/family', 'POST', {
      name: 'Papa', relation: 'parent', monthlySupport: 9000, hasHealthCover: false,
    }, cookie);

    await call('/api/family', 'POST', {
      name: 'Riya', relation: 'sibling', monthlySupport: 6000, hasHealthCover: true,
    }, cookie);
  }

  return cookie;
}


async function run() {
  fs.mkdirSync(OUT, { recursive: true });

  const cookie = await seed();
  const [cookieName, cookieValue] = cookie.split('=');

  const browser = await chromium.launch();
  const problems = [];

  for (const size of SIZES) {
   for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
    });

    /*
      The session is set as a cookie rather than by filling in the login form.

      Driving the form once per size per page would be a dozen sign-ins in a
      few seconds, which the login limiter refuses, and rightly so.
    */
    await context.addCookies([
      { name: cookieName, value: cookieValue, domain: 'localhost', path: '/' },
    ]);

    /*
      Choose the theme the same way a person would, by writing the choice into
      localStorage, and do it with addInitScript so it lands before the page's
      own code runs. Setting it after the page loaded would photograph the
      light theme flipping to dark, which is not what either one looks like.
    */
    await context.addInitScript('localStorage.setItem("nestworth-theme", "' + theme + '")');

    const page = await context.newPage();

    page.on('pageerror', (error) => {
      problems.push(size.name + ' ' + theme + ' crashed: ' + error.message);
    });

    for (const target of PAGES) {
      await page.goto(WEB + target.path);
      await page.waitForSelector('text=' + target.waitFor, { timeout: 20000 });

      /*
        Scroll the whole page before taking the picture.

        Several things on this site only draw once they have been scrolled into
        view: the reveal animations, and the projection chart, which fills in
        its line when it first appears. A screenshot taken without scrolling
        catches them un-drawn, and an empty chart in a picture looks exactly
        like a broken one. This was mistaken for a bug once already.
      */
      await page.evaluate(async () => {
        const step = window.innerHeight / 2;

        for (let y = 0; y < document.body.scrollHeight; y = y + step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }

        window.scrollTo(0, 0);
      });

      // Let the width and colour transitions finish, or the picture catches
      // every bar halfway through growing.
      await page.waitForTimeout(1500);

      const label = target.path.replace('/', '') + '-' + size.name + '-' + theme;

      await page.screenshot({ path: path.join(OUT, label + '.png'), fullPage: true });

      // Is the page wider than the screen?
      const box = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      if (box.scrollWidth > box.clientWidth + 1) {
        problems.push(label + ' scrolls sideways: ' + box.scrollWidth + ' > ' + box.clientWidth);
      }

      /*
        Is any text bigger than the box it was given?

        Two kinds of element are skipped, because both look like clipping to a
        measurement and neither is a fault.

        An element with no text in it is a decoration: a dot, a rule, a spacer.
        There is nothing there to be cut off.

        An element carrying Tailwind's "truncate" class has asked to be cut off,
        with an ellipsis, because it holds something long and unpredictable. The
        bank narrations in the spending table are the case here. Flagging those
        would mean nine known-good lines in every report, and a report with
        known-good lines in it is one people stop reading.
      */
      const clipped = await page.evaluate(() => {
        const found = [];

        document.querySelectorAll('p, span, h1, h2, h3, td, th, button').forEach((node) => {
          const text = node.textContent.trim();

          if (text.length === 0) {
            return;
          }

          if (node.classList.contains('truncate') === true) {
            return;
          }

          if (node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2) {
            found.push(text.slice(0, 40));
          }
        });

        return found;
      });

      clipped.forEach((text) => {
        problems.push(label + ' clips text: "' + text + '"');
      });

      console.log('  saved ' + label + '.png');
    }

    await context.close();
   }
  }

  await browser.close();

  console.log('');
  console.log('  pictures are in ' + OUT);
  console.log('');

  if (problems.length === 0) {
    console.log('  no layout problems found');
    return;
  }

  console.log('  PROBLEMS:');
  problems.forEach((problem) => {
    console.log('    - ' + problem);
  });
}

run();
