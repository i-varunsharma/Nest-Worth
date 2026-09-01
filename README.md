# Nest-Worth

A personal finance planner for Indian households. You tell it what you earn,
what you owe, what you own and what you are saving for; it works out which debt
to clear first, what each goal costs per month, and whether the plan actually
fits in your income.

Built as a learning project, so the code is written to be read. Files open with
a comment explaining what they are for and why they are built the way they are,
and the awkward decisions are argued out in comments rather than left for you to
guess at.

---

## Running it

You need [Node.js](https://nodejs.org) 20 or newer. Nothing else — there is no
database server to install.

Open two terminals.

**Terminal one, the API:**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Terminal two, the app:**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and create an account.

To run the tests:

```bash
cd backend  && npm test    # 126 tests: the API, the SQL, the simulation, transactions, the coach
cd frontend && npm test    # 76 tests: the money maths, the components and the charts
```

To look at what the app has stored:

```bash
cd backend
npm run db:show     # every table, printed as a grid
npm run db          # the SQLite shell, for your own queries
```

Or install the **SQLite Viewer** extension for VS Code and click
`backend/data/nestworth.db` to browse it like a spreadsheet.

`SETUP.md` covers the rest: reading and editing the data, Google sign-in, real
text messages, real email, and what to do before putting this on the internet.

---

## What it does

| Page | What it is for |
|---|---|
| `/` | Landing page. Runs the real recommendation model on numbers the visitor can change. |
| `/signup`, `/login` | Three ways in: email and password, a code by text, or Google. |
| `/forgot-password`, `/reset-password` | Setting a new password, by a one-time link. |
| `/onboarding` | The questions everything else is calculated from. |
| `/dashboard` | The overview: what to do this month, and why. Includes the AI coach. |
| `/plans` | The same money spent four ways, each played out fifteen years, in charts. |
| `/debts` | Every debt, with payoff dates and an extra-payment slider. |
| `/goals` | What you are saving for, and what each costs per month. |
| `/net-worth` | What you own against what you owe. |
| `/check-in` | What actually happened this month, as opposed to the plan, with the totals the database works out. |
| `/settings` | Name, household, password, and closing the account. |

---

## How it is put together

Two separate programs that talk over HTTP. They are kept apart on purpose: the
browser can be lied to, so nothing it says is trusted, and every rule that
matters is enforced again on the server.

```
Nest-Worth/
├── backend/                  the API. Node, Express and SQLite
│   ├── data/                 the SQLite file. Created on first run, never committed
│   ├── src/
│   │   ├── server.js         starts the app, and stops it without dropping anybody
│   │   ├── app.js            builds the app: CORS, cookies, routes, error handling
│   │   ├── database/
│   │   │   ├── schema.sql    every table and index, in one readable file
│   │   │   └── db.js         opens the database, runs the schema, migrates
│   │   ├── lib/              the thinking. No HTTP in here
│   │   │   ├── sessions.js   who is signed in, and the cookie that says so
│   │   │   ├── otp.js        the six digit code: making, sending, checking
│   │   │   ├── passwordReset.js  the reset link, built the same way as the OTP
│   │   │   ├── rateLimit.js  refusing somebody who is asking far too often
│   │   │   ├── insights.js   the reporting SQL: aggregates, GROUP BY, windows
│   │   │   ├── logger.js     request ids, timings, and what to never log
│   │   │   ├── advice.js     the agent loop. The only file that talks to Claude
│   │   │   ├── tools.js      the calculations Claude is allowed to run
│   │   │   └── validate.js   the server's own copy of the form checks
│   │   └── routes/           one file per thing the app stores
│   │       ├── auth.js       signup, login, OTP, Google, reset, logout
│   │       ├── household.js  the onboarding answers
│   │       ├── debts.js      ┐
│   │       ├── goals.js      │ all four are the same four routes:
│   │       ├── assets.js     │ list, add, change, remove
│   │       ├── checkins.js   ┘
│   │       ├── advice.js     the AI coach, streamed as it is written
│   │       ├── insights.js   GET /api/insights, the reporting endpoint
│   │       └── scenarios.js  GET /api/scenarios, the plan comparison
│   └── tests/                run with npm test
│
├── frontend/                 the app. React, Vite and Tailwind
│   ├── tailwind.config.js    every colour, font, shadow and timing. One source of truth
│   └── src/
│       ├── App.jsx           which page shows at which address
│       ├── lib/              the browser's own code, plus shims into shared/
│       │   ├── api.js        every request to the backend goes through here
│       │   ├── checkins.js   what actually happened, against what was planned
│       │   ├── validation.js the browser's copy of the form checks
│       │   └── debt.js, goals.js, networth.js, plan.js
│       │                     one line each, re-exporting shared/ below
│       ├── components/
│       │   ├── charts/       the four charts, hand-drawn. No chart library
│       │   ├── shared/       Button, TextField, ErrorBoundary. Used everywhere
│       │   ├── layout/       navbar and footer
│       │   ├── landing/      the marketing page
│       │   ├── auth/         sign-in screens
│       │   └── app/          the signed-in screens
│       └── pages/            one file per address in the table above
│   └── tests/                the money maths and the components, npm test
│
├── shared/                   the money maths, used by BOTH sides
│   ├── plan.js               the recommendation model
│   ├── debt.js               payoff dates, avalanche ordering, interest saved
│   ├── goals.js              what each goal costs, and the emergency fund
│   └── networth.js           assets against debts
│
└── ai-integration/           notes on how the AI coach is wired up
```

### Where the work happens

Most of the API hands out rows and lets the browser add them up. That is the
right call when the browser needs every row anyway, which is what the debts and
goals pages do.

It is the wrong call for an average, a running total or a share, where the
answer is one number and the rows are only the raw material. Fetching two years
of check-ins so JavaScript can work out a mean means sending every column of
every row across the network to throw nearly all of it away. Those live in
`backend/src/lib/insights.js` as real SQL instead:

| What | The SQL that does it |
|---|---|
| Running total of everything kept | `SUM(...) OVER (ORDER BY month)`, a window function |
| Each month against the one before | `LAG(...) OVER (ORDER BY month)` |
| Average share of income kept | `AVG`, which skips NULL rather than counting it as zero |
| Best and worst month | a `WITH` clause, used twice without repeating it |
| Debts and assets by kind | `GROUP BY`, with each share against a scalar subquery |
| Never dividing by zero | `NULLIF(income, 0)` |

There is a test for each, with the expected number worked out by hand in a
comment. A wrong aggregate does not throw and does not look wrong: it returns a
number, in the right format, in the right place on the page, and it is simply
not true.

### Why it is arranged this way

**`shared/` is shared on purpose.** The money maths is the one thing both sides
genuinely need: the browser draws the dashboard with it, and the server hands it
to Claude as tools. It lived in `frontend/src/lib/` until the AI coach needed it
too. Copying it would have meant the coach and the debts page could quietly
disagree about a payoff date, with no way to tell which was right. The four files
left behind in `frontend/src/lib/` are one line each, re-exporting it, so every
import in the app still reads `../lib/debt`.

**`lib/` thinks, `routes/` talks.** The files in `backend/src/lib/` know nothing
about HTTP: no `req`, no `res`, no status codes. They take values and return
values, which is why they can be tested directly, without a server. The route
files handle the web side and call into them.

**The four list routes are deliberately identical.** `debts.js`, `goals.js`,
`assets.js` and `checkins.js` all follow the same shape — list, add, change,
remove. Once you can read one, you can read all four, and the same pattern
turns up in almost every app you will ever work on.

**The plan subtracts before it splits.** `buildPlan` takes the household
support, the EMI and the fixed living costs off the income first, and only then
divides what is left three ways. Splitting a percentage straight off income is
what makes budgeting apps feel written for somebody else: it asks a household
paying 35,000 in rent to keep the same share as one paying 8,000.

**One theme, one file.** Every colour, font, shadow and animation timing lives in
`frontend/tailwind.config.js` with a comment saying why. Pages use those tokens
rather than inventing their own, which is what keeps the whole site looking like
one product.

**The two form-check files are a pair, not a duplicate.** The frontend's
`lib/validation.js` exists to be helpful, catching a missing `@` before anyone
waits on the network. The backend's `lib/validate.js` exists to be true, because
anybody can skip the form entirely and post straight at the API with `curl`.

---

## The security decisions, in short

These are the parts worth being able to explain out loud.

- **Passwords** are hashed with bcrypt at cost 12. The plain password is never
  stored, never logged, and never leaves the request it arrived in.
- **Sessions** are a random 256-bit token in an `httpOnly` cookie, so page
  JavaScript cannot read it even if a script were injected into the site. The
  token is stored server-side, which means a session can be revoked instantly —
  the thing a JWT cannot do without keeping the very table it was avoiding.
- **One-time codes and reset links** are stored hashed, expire, are destroyed
  after use, and are never sent back to the browser in a response. A secret the
  browser can read proves nothing about who is holding it.
- **Changing or resetting a password signs out every other browser**, because
  somebody doing either may be doing it precisely because a stranger got in.
  Changing it while signed in also requires the current password, so an unlocked
  laptop is not enough to take an account over.
- **Sign-in, sign-up and message sending are rate limited**, so a password
  cannot be guessed as fast as the network allows. No password rule can
  substitute for this.
- **Login and the forgot-password form never reveal whether an account exists.**
  Both answer identically for a real and an unknown address, so neither can be
  used to work out who has signed up here.
- **Every query filters on the user id from the session cookie**, never on
  anything the browser sent. This is what stops somebody reading a stranger's
  finances by changing a number in a URL, and there is a test whose only job is
  to keep it true.
- **Deleting an account really deletes it.** One `DELETE` on the users row takes
  the household, debts, goals, assets and check-ins with it, through the
  `ON DELETE CASCADE` lines in `schema.sql`. A test checks no orphaned rows are
  left behind, and that the email can be used to sign up again afterwards.
- **Every table is indexed on user_id.** Without it SQLite answers
  "WHERE user_id = ?" by reading every row in the table. It makes no difference
  at two accounts and a great deal at fifty thousand. `checkins` needs no index
  of its own, because its `UNIQUE (user_id, month)` line already builds one.
- **Expired rows are swept at startup.** Sessions, one-time codes and reset
  links are each destroyed when somebody tries to use an expired one, but that
  never cleans up after people who do not come back. `db.js` clears them when
  the server starts.
- **The Claude API key never leaves the server.** It lives in `backend/.env`,
  which git ignores, and only `backend/src/lib/advice.js` reads it. A key in
  frontend code is a key anybody can read in their browser and spend money with.
  The AI route is rate limited to 20 questions an hour per person, because it is
  the only route in the app that costs real money to answer.
- **A session that ends mid-use sends you to the login screen.** `requireUser`
  answers with a `no_session` code, which is what the browser reacts to rather
  than the bare 401. That distinction matters: a wrong password and a wrong
  one-time code are also 401s, and bouncing somebody to the login screen for
  mistyping a code would be worse than the dead end it fixes.
- **The AI cannot reach another person's money.** Every calculation it can run
  takes the user id from the session cookie; not one of them accepts an argument
  naming a person. The conversation the browser sends back is rebuilt from
  scratch and anything that is not a plain turn of text is dropped, so a browser
  cannot forge a calculation result and have it repeated back as fact.

---

## The charts

`/plans` shows the same income arranged four ways. Four charts, and the type of
each was picked from the job it does rather than from what looks impressive.

| What the reader has to do | The chart |
|---|---|
| See where one month's money goes | a stacked bar, part-to-whole |
| Compare four plans over fifteen years | multi-line, one axis |
| See how much sooner the debt clears | a dumbbell, before against after |
| Judge one number against a target | a meter, not a chart |

Three rules the colours follow, and they are why the chart colours in
`tailwind.config.js` are not the UI colours:

**The UI colours failed as chart colours.** `accent` and `ink` are too dark and
too grey to be told apart as marks. The chart steps sit on the same hues, lifted
into the band where they stay separable, and they were checked with a validator
rather than by eye. Roughly one man in twelve cannot distinguish red from green,
and "these look different to me" is not a test.

**Only choices get a colour.** Spend, save and invest are decisions and each has
a hue. The money already committed is grey: it is not a choice, and giving it a
colour would make it compete with the parts somebody can act on.

**One plan at a time is coloured.** On the comparison chart the plan being read
is green and the other three are one grey. Four coloured lines is a chart where
the eye has nowhere to land.

Every chart has a legend, and the page ends with a table of every figure on it,
so nothing is available only as a picture.

### Looking at them

```bash
cd frontend
npm run shots:api    # a throwaway API on 4001, its own database, limits off
npm run shots:web    # vite on 5174, pointed at it
npm run shots        # drives a real browser, saves to frontend/screenshots/
```

The component tests run in jsdom, which has no layout engine. It can say a
legend was rendered and that no width came out as NaN; it cannot say a label was
cut in half, or that the comparison chart collapsed to six pixels tall on a
phone. Both of those were really here, and both were found by looking at what
this script produced rather than by a test.

It reports horizontal overflow and text clipped by its own box, and it scrolls
each page before shooting, because several things here only draw once they have
been scrolled into view. It never touches the real database, for the same reason
the tests do not: it needs a fresh account with fixed numbers every run.

---

## Running it as a service

The parts that have nothing to do with features, and everything to do with
whether this could be left running.

- **Every request has an id**, returned in an `X-Request-Id` header and printed
  on every log line for that request. One request produces several lines and
  several requests overlap, so without an id there is no way to tell which
  belongs to which. A person reporting a problem can name the exact request
  instead of a rough time, and a 500 sends the id back in the body.
- **Every request is timed.** An endpoint that is merely slow never throws, so
  it never appears anywhere until somebody complains. `ms=` on every line makes
  it obvious. Signup is the slow one on purpose: bcrypt at cost 12.
- **Passwords, tokens and one-time codes are never logged.** A log file is the
  easiest place in a system to leak a secret, because nobody thinks of it as
  storage: it gets pasted into tickets and kept longer than any database row.
- **Logs are JSON in production and readable text in development.** A sentence
  is nicer on a laptop and useless to a machine.
- **`/api/health` runs a real query.** It used to answer `ok: true` without
  checking anything, which meant it stayed green while the database was gone. A
  health check that cannot go red is decoration. It answers 503 when SQLite is
  unreachable, which is what a load balancer knows how to act on.
- **SIGTERM and SIGINT shut down in order:** stop accepting new connections,
  let the requests already in flight finish, close SQLite so it folds its
  write-ahead log back into the main file, then exit. There is a ten second
  limit, because one request waiting on a slow AI answer should not hold a
  deploy open forever.
- **Multi-step writes are transactions.** Signup, password change and password
  reset each write several rows, and a failure halfway through the reset would
  be the worst kind: password changed, old sessions not deleted, success
  reported. `db.transaction()` means either all of it happens or none does.

---

## Known limits

Worth saying plainly, since this is a learning project rather than a product.

- **No SMS or email provider is connected.** The phone code and the password
  reset link are printed in the terminal running the API. `SETUP.md` explains
  what to connect and what paperwork India requires first.
- **Google sign-in needs a client id** before the button does anything.
- **The AI coach needs an Anthropic API key** in `backend/.env`. Without one the
  card on the dashboard says so, and everything else works as normal.
- **A language model can be confidently wrong.** Every figure it is shown is read
  out of the database and summed in JavaScript first, and it is told never to
  invent one, but nothing stops it drawing a poor conclusion from correct
  numbers. It is a second opinion on the arithmetic, not the arithmetic.
- **Rate limit counts live in memory**, so they reset when the server restarts
  and would need Redis if the app ever ran as more than one copy.
- **No test drives a real browser.** The component tests run in jsdom, which is
  a fake browser: it can say what was rendered and what a click does, but not
  whether anything looks right. Catching a layout that breaks at 380px still
  means opening the page yourself.

---

Educational guidance, not regulated investment advice.
