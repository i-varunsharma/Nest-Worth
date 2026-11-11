# Nest-Worth

Nest-Worth is a money planner for Indian families where one person's salary
supports the whole household (parents, a spouse, kids, sometimes siblings).

You enter your income, rent and bills, the family members you support, your
debts, goals and savings. The app then:

- builds a monthly plan (spend / save / invest) from those real amounts
- tells you which debt to clear first and what each goal costs per month
- stress tests the plan, for example "what if I lose my job for 4 months" or
  "what if a parent without health cover needs a ₹3,00,000 hospital stay"
- reads a bank statement CSV and sorts the spending into categories
- has an AI coach (Gemini or Claude) that answers questions using the app's own
  calculations

I built this as a learning project, so the code has a lot of comments explaining
why things are done a certain way.

For how the whole thing fits together, see
[docs/ARCHITECTURE_AND_FLOW.md](docs/ARCHITECTURE_AND_FLOW.md).

---

## Running it

You need [Node.js](https://nodejs.org) 20 or newer. There is no database server
to install, SQLite is just a file.

Open two terminals.

**Terminal 1, the API:**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Terminal 2, the app:**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and create an account.

Tests:

```bash
cd backend  && npm test    # API, repositories, SQL, money maths, AI tools
cd frontend && npm test    # money maths, hooks, components, charts, pages
```

To see what is stored in the database:

```bash
cd backend
npm run db:show     # prints every table
npm run db          # opens the SQLite shell
```

You can also install the **SQLite Viewer** extension in VS Code and open
`backend/data/nestworth.db`.

Other docs:

- `SETUP.md` - Google sign-in, real SMS and email, and what to do before deploying
- `docs/ARCHITECTURE_AND_FLOW.md` - architecture diagram and step by step request flows
- `docs/SYSTEM_DESIGN.md` - requirements, data model and design decisions
- `docs/DEBUGGING.md` - how to trace a wrong number or a failing request
- `docs/AI_COACH.md` - how the AI coach, its tools and the two providers fit together

---

## Pages

| Page | What it does |
|---|---|
| `/` | Landing page with a small planner you can try without signing up |
| `/signup`, `/login` | Email + password, phone OTP, or Google |
| `/forgot-password`, `/reset-password` | Reset password with a one-time link |
| `/onboarding` | The household questions the plan is built from |
| `/dashboard` | This month's plan, how many shocks you survive, AI coach, daily note |
| `/family` | People you support, how much each costs, who has no health cover |
| `/plans` | Compare a few ways to use the same money over 15 years |
| `/stress-test` | Job loss, pay cut, hospital bill or family need, month by month for a year |
| `/debts` | All debts with payoff dates and an extra payment slider |
| `/goals` | Savings goals and how much each needs per month |
| `/net-worth` | What you own minus what you owe |
| `/spending` | Upload a bank statement CSV, see spending by category |
| `/recap` | The whole year added up |
| `/check-in` | What actually happened this month vs the plan |
| `/settings` | Name, household, password, delete account |

---

## Tech stack

- **Frontend:** React, Vite, Tailwind, React Router. Charts are plain SVG.
- **Backend:** Node, Express 5, SQLite (better-sqlite3), bcrypt.
- **Shared:** `shared/` has the money maths and is used by both frontend and backend.
- **AI:** Gemini (default, has a free tier) or Claude, picked by which API key is set.
- **CI:** GitHub Actions runs tests, lint and build on every push.

---

## Folder structure

```
Nest-Worth/
├── backend/
│   ├── src/
│   │   ├── server.js            starts the server, handles shutdown
│   │   ├── app.js               middleware order and routes
│   │   ├── config.js            all env variables in one place
│   │   ├── database/            schema.sql and db.js (connection, migrations, transactions)
│   │   ├── http/                AppError, error handler, cookies, validation helpers
│   │   ├── middleware/          logging, who is signed in, rate limits (all limits in limits.js)
│   │   ├── routes/              controllers: validate, call service, send response
│   │   ├── services/            business logic: auth, sessions, OTP, imports, finances
│   │   ├── repositories/        all SQL, one file per table
│   │   ├── validation/          rules for request bodies (account rules come from shared/)
│   │   ├── reports/             read-only SQL reports: insights, recap, signals
│   │   ├── ai/                  prompt, facts, agent loop
│   │   │   ├── tools/           one file per tool the AI can run, index.js lists them
│   │   │   └── providers/       Gemini and Claude
│   │   └── utils/               logger.js, time.js (MINUTE_MS, HOUR_MS, DAY_MS)
│   └── tests/
│
├── frontend/
│   ├── tailwind.config.js       all colours, fonts, shadows
│   └── src/
│       ├── App.jsx              routes
│       ├── pages/               one file per page
│       ├── components/          shared/, layout/, charts/, and one folder per feature
│       ├── hooks/               useAsyncData, useRecordEditor, useGoogleSignIn, useReveal, useTheme
│       ├── lib/                 api.js, loadFinances.js, format.js, formErrors.js, re-exports of shared/
│       └── styles/global.css    light and dark theme colour values
│   └── tests/
│
├── shared/                      money maths used by both sides
│   ├── finances.js              summariseFinances, the main function
│   ├── format.js                money and dates as text (formatRupees, monthLabel ...)
│   ├── accountFields.js         name, email, password, phone, OTP rules
│   ├── numbers.js               keepBetween, roundToNearest500
│   └── plan.js debt.js goals.js networth.js scenarios.js family.js shocks.js categories.js
│
├── docs/                        architecture, system design, debugging, AI coach
└── .github/workflows/ci.yml
```

---

## Main design decisions

**Money maths lives in `shared/`.** The browser needs it to update numbers
instantly when you move a slider. The server needs it for the AI coach. Earlier
it was only in the frontend, and copying it to the backend would mean two
versions that could give different answers. So both import the same files.

**Every plan number comes from one function.** `summariseFinances` in
`shared/finances.js`. The browser calls it through `lib/loadFinances.js`, the
server through `services/financeService.js`. Before this, five places built the
plan separately and they started giving different numbers (for example the
safety net was leaving out rent). Those bugs now have regression tests.

**Backend is split into layers.** Routes handle HTTP, services have the logic,
repositories have the SQL, and one error handler formats all errors. Services
don't know about `req`/`res`, so they can be tested without starting a server.

**Debts, goals, assets and family members share one router and one repository.**
`recordRoutes.js` and `ownedRecordRepository.js`. The rule "only touch rows of
the signed-in user" is written once, so a new record type can't forget it.

**Every page loads data the same way.** `useAsyncData` handles loading, errors
and late responses. `useRecordEditor` handles add, edit and delete.

**The plan subtracts fixed costs first, then splits.** `buildPlan` removes family
support, EMIs and rent/bills from income, and only then splits what is left into
spend, save and invest. A fixed percentage of income doesn't work when one family
pays ₹35,000 rent and another pays ₹8,000.

**Validation runs on both sides, from one set of rules.** The account rules
(name, email, password, phone, OTP) are in `shared/accountFields.js`. The form
uses them for quick feedback, and the server runs the same functions as the real
check, because anyone can call the API directly with `curl`. Before, there were
two copies and their messages had drifted apart.

**Heavy calculations are done in SQL.** Averages, running totals and month vs
month changes are in `reports/insights.js` using window functions (`SUM OVER`,
`LAG`), `GROUP BY`, `WITH` and `NULLIF` to avoid dividing by zero. Sending every
row to the browser just to calculate one average would be wasteful. Each query
has a test with the expected answer worked out by hand.

---

## Bank statement import

- **Any bank layout.** Banks export different CSV formats (one Amount column with
  Dr/Cr, or separate Withdrawal/Deposit columns, different date formats, extra
  lines above the header). `statementParser.js` finds the header row and figures
  out which column is which from the header names.
- **Dates are read day first.** `05/01/2026` is 5 January. There is no way to
  know from the text alone, so this is a decision, and there's a test for it.
- **Importing the same file twice adds nothing.** Each row gets a hash of its
  date, description, amount, direction and how many identical rows came before
  it in the file (so two ₹420 Swiggy orders on the same day stay as two). The
  column has a UNIQUE index and the insert uses `INSERT OR IGNORE`.
- **Categories use rules, not AI.** Rules are instant, free, and give the same
  answer every time. Unknown merchants go into "everything else" and the user can
  fix them.
- **Investments are not counted as spending.** A SIP is money you still own, so
  it's shown separately as "put away".

---

## Daily note on the dashboard

The AI coach only answers what you ask. The daily note points out things you
might not think to ask, like food spending doubling this month.

It is done in two steps:

1. `reports/signals.js` finds the facts with SQL (category up or down vs last
   month, a debt above 15% interest, one big payment, a month where almost
   nothing was saved). Same data always gives the same facts, so it's testable.
2. `services/briefingService.js` asks the model to turn those facts into
   sentences. The model doesn't decide what is true, it only writes it up.

The note is written once a day and stored, since each one costs a model call. If
no AI key is set, the facts are shown as plain sentences.

---

## Light and dark theme

Every colour is a CSS variable in `frontend/src/styles/global.css`, defined once
for light (`:root`) and once for dark (`[data-theme="dark"]`). Tailwind classes
point to those variables, so changing `data-theme` on `<html>` switches the whole
app and no component needs to know about it.

- Colours are stored as separate R G B numbers so Tailwind opacity classes like
  `border-accent/25` still work.
- Some colours should not change, like text on the always-dark landing panels.
  Those use a separate name, `onNight`.
- A small script in `index.html` sets the theme before React loads, so there is
  no white flash on page load.

---

## Security

- **Passwords** are hashed with bcrypt (the `bcryptjs` package, cost 12). Never stored or logged in plain text.
- **Sessions** are a random 256-bit token in an `httpOnly` cookie, stored in the
  database. I used this instead of JWT because deleting the row logs that browser
  out immediately.
- **OTP codes and reset links** are stored hashed, expire, are deleted after use,
  and never sent back to the browser.
- **Changing or resetting a password logs out all other devices.** Changing it
  while signed in also needs the current password.
- **Rate limits** on login, signup, OTP, password reset and the AI route.
- **Login and forgot password don't reveal if an account exists.** Same response
  for a real or unknown email.
- **Every query uses the user id from the session**, never from the request
  body or URL. There is a test that checks one user can't read another's data.
- **Deleting an account deletes everything** through `ON DELETE CASCADE`. A test
  checks nothing is left behind.
- **Every table has an index on `user_id`.**
- **Expired sessions, codes and reset links are cleaned up on server start.**
- **The AI key stays on the server** in `backend/.env`. The browser doesn't even
  know which model is being used. AI is limited to 20 questions per hour per user.
- **The AI can only read the signed-in user's data.** Tools take the user id from
  the session. Chat history sent by the browser is cleaned so it can't fake a
  tool result.
- **When a session expires mid-use**, the API returns code `no_session` and the
  browser goes to login. A wrong password or OTP is also a 401 but has a different
  code, so the user stays on the form.

---

## AI coach

Two providers, Gemini (default) and Claude. The app works the same with either.

The agent loop in `ai/advice.js` is written once and uses its own message format:

```
{ role, text }          someone said something
{ toolCalls: [...] }    the model wants a calculation
{ toolResults: [...] }  we ran it, here is the result
```

`ai/providers/gemini.js` and `ai/providers/claude.js` convert this to each API's
format. They differ quite a bit (role names, where the system prompt goes, Gemini
needing UPPERCASE type names in tool schemas), but all of that stays in the
provider files.

The model never does maths itself. It calls tools (one file each in `ai/tools/`)
that use the same `shared/` functions as the pages.

Gemini tests run against a fake local server, so they don't need a key or internet.

---

## Charts

All charts are hand-made SVG. The chart type was picked based on what the user
needs to read:

| What the user needs | Chart |
|---|---|
| Where one month's money goes | stacked bar |
| Compare plans over 15 years | multi-line chart |
| How much sooner a debt clears | dumbbell chart |
| One number vs a target | meter |
| Compare 12 spending categories | sorted horizontal bars (not a pie, too many slices to compare) |

- Chart colours are separate from UI colours, because the UI colours were too
  close to each other. They were checked for colour blindness too.
- Only choices (spend, save, invest) get a colour. Fixed costs are grey.
- In the plan comparison, only the selected plan is coloured.
- Dark theme chart colours were picked separately, not just dimmed.
- Every chart has a legend and a table with the actual numbers.

### Screenshots

```bash
cd frontend
npm run shots:api    # test API on port 4001 with its own database
npm run shots:web    # vite on 5174 pointed at it
npm run shots        # opens a real browser and saves screenshots to frontend/screenshots/
```

Component tests run in jsdom, which can't see layout, so this script catches
things like cut-off labels or a chart collapsing on mobile. It takes four pages,
at three screen widths, in both themes, and reports overflow and clipped text.

---

## Production basics

- **Request id** on every request (`X-Request-Id` header and in every log line),
  so logs for one request can be found. A 500 response includes it too.
- **Every request is timed** (`ms=` in logs). Signup is slow on purpose because of bcrypt.
- **Passwords, tokens and OTPs are never logged.**
- **Logs** are JSON in production and readable text in development.
- **`/api/health`** runs a real database query and returns 503 if it fails.
- **Graceful shutdown** on SIGTERM/SIGINT: stop new connections, finish running
  requests, close SQLite, exit. Max 10 seconds.
- **Multi-step writes use transactions** (signup, password change, reset), so
  they either fully happen or don't happen at all.

---

## Known limitations

- **No SMS or email provider connected.** OTP codes and reset links are printed
  in the backend terminal. `SETUP.md` explains how to connect one.
- **Google sign-in** needs a client id.
- **AI** needs a Gemini or Anthropic key in `backend/.env`. Without it the coach
  shows a message and the daily note shows plain facts.
- **The daily note is generated on the first dashboard visit of the day**, not by
  a nightly job. Simpler, but that one page load waits for the model.
- **Statements are uploaded by hand.** The proper way in India is the Account
  Aggregator framework, which needs a licensed partner.
- **The stress test is a model, not a prediction.** It assumes spending halves in
  a crisis, investing stops, and health cover leaves 20% of a bill to pay. All
  of these are constants in `shared/shocks.js` and shown on the page.
- **Unknown merchants** go into "everything else" until the user fixes them.
- **The AI can still draw a wrong conclusion** from correct numbers. It's a
  second opinion, not financial advice.
- **Rate limit counts are in memory**, so they reset on restart. Multiple
  servers would need Redis.
- **Screenshot checks are not part of `npm test`.** Someone still has to look at them.

---

For education only, not regulated investment advice.
