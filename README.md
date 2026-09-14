# Nest-Worth

A personal finance planner for Indian households where one salary supports a
family. You list who you support and what each person costs, along with what you
earn, owe, own and are saving for. It builds a plan from those real amounts,
works out which debt to clear first and what each goal costs, and stress tests
the whole thing: what happens to your cash if the income stops for four months,
or a parent without health cover needs a ₹3,00,000 hospital stay.

### What makes it different

- **Family circle.** Most budgeting apps assume the salary is yours alone. Here
  you name the people it carries, and the plan uses the real amounts.
- **Stress test.** Four common shocks, walked month by month, with the month the
  cash runs out and exactly how much more would need to be put by.
- **One set of numbers.** The dashboard, every page and the AI coach get their
  figures from the same function, so they never disagree.

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
cd backend  && npm test    # 234 tests: the API, the SQL, the money maths, the AI tools
cd frontend && npm test    # 95 tests: the money maths, the components and the charts
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

`docs/SYSTEM_DESIGN.md` explains the architecture, the data model and the
decisions behind them. `docs/DEBUGGING.md` shows how to trace a wrong number or
a failing request to the line that causes it.

---

## What it does

| Page | What it is for |
|---|---|
| `/` | Landing page. Runs the real recommendation model on numbers the visitor can change. |
| `/signup`, `/login` | Three ways in: email and password, a code by text, or Google. |
| `/forgot-password`, `/reset-password` | Setting a new password, by a one-time link. |
| `/onboarding` | The questions everything else is calculated from. |
| `/dashboard` | The overview: what to do this month, and why. How many shocks the household survives. The AI coach, and the note it writes without being asked. |
| `/family` | The people this salary supports, what each costs, and who has no health cover. |
| `/plans` | The same money spent several ways, each played out fifteen years, in charts. Pick one and the dashboard follows it. |
| `/stress-test` | A job loss, pay cut, hospital bill or family need, walked month by month for a year. |
| `/debts` | Every debt, with payoff dates and an extra-payment slider. |
| `/goals` | What you are saving for, and what each costs per month. |
| `/net-worth` | What you own against what you owe. |
| `/spending` | A bank statement, read line by line and sorted into categories. |
| `/recap` | A whole year of those, added up and looked back on. |
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
│   │   │   ├── snapshot.js   reads one person's data and runs shared/finances.js on it
│   │   │   ├── rows.js       turns database rows into app objects, in one place
│   │   │   ├── sessions.js   who is signed in, and the cookie that says so
│   │   │   ├── otp.js        the six digit code: making, sending, checking
│   │   │   ├── passwordReset.js  the reset link, built the same way as the OTP
│   │   │   ├── rateLimit.js  refusing somebody who is asking far too often
│   │   │   ├── insights.js   the reporting SQL: aggregates, GROUP BY, windows
│   │   │   ├── logger.js     request ids, timings, and what to never log
│   │   │   ├── advice.js     the agent loop, in one neutral conversation shape
│   │   │   ├── statement.js  reading a bank CSV: any layout, any date format
│   │   │   ├── categorise.js which category a bank line belongs to
│   │   │   ├── signals.js    what changed, found in SQL before any AI is involved
│   │   │   ├── briefing.js   turning those findings into the note on the dashboard
│   │   │   ├── recap.js      a whole year, added up
│   │   │   ├── ai/           the only files that reach a model
│   │   │   │   ├── gemini.js   Google's Gemini, over plain fetch. Free tier
│   │   │   │   ├── claude.js   Anthropic's Claude, over the SDK
│   │   │   │   └── index.js    picks whichever key is set
│   │   │   ├── tools.js      the calculations the AI is allowed to run
│   │   │   └── validate.js   the server's own copy of the form checks
│   │   └── routes/           one file per thing the app stores
│   │       ├── auth.js       signup, login, OTP, Google, reset, logout
│   │       ├── household.js  the onboarding answers
│   │       ├── family.js     the people the salary supports
│   │       ├── debts.js      ┐
│   │       ├── goals.js      │ all four are the same four routes:
│   │       ├── assets.js     │ list, add, change, remove
│   │       ├── checkins.js   ┘
│   │       ├── advice.js     the AI coach, streamed as it is written
│   │       ├── insights.js   GET /api/insights, the reporting endpoint
│   │       ├── scenarios.js  GET /api/scenarios, the plan comparison
│   │       ├── transactions.js  importing a statement, and reading it back
│   │       ├── briefing.js   GET /api/briefing, today's note
│   │       └── recap.js      GET /api/recap, the year
│   └── tests/                run with npm test
│
├── frontend/                 the app. React, Vite and Tailwind
│   ├── tailwind.config.js    every colour, font, shadow and timing. One source of truth
│   └── src/
│       ├── styles/global.css the actual colour values, in a light set and a dark one
│       ├── App.jsx           which page shows at which address
│       ├── lib/              the browser's own code, plus shims into shared/
│       │   ├── api.js        every request to the backend goes through here
│       │   ├── loadFinances.js  fetches what the plan needs and builds it, for every page
│       │   ├── checkins.js   what actually happened, against what was planned
│       │   ├── validation.js the browser's copy of the form checks
│       │   └── debt.js, goals.js, networth.js, plan.js
│       │                     one line each, re-exporting shared/ below
│       ├── components/
│       │   ├── charts/       the five charts, hand-drawn. No chart library
│       │   ├── shared/       Button, TextField, ErrorBoundary. Used everywhere
│       │   ├── layout/       navbar and footer
│       │   ├── landing/      the marketing page
│       │   ├── auth/         sign-in screens
│       │   └── app/          the signed-in screens
│       └── pages/            one file per address in the table above
│   └── tests/                the money maths and the components, npm test
│
├── shared/                   the money maths, used by BOTH sides
│   ├── finances.js           the one function every number comes from
│   ├── family.js             family totals and the family member checks
│   ├── shocks.js             the stress test
│   ├── categories.js         the transaction categories, agreed by both sides
│   ├── plan.js               the recommendation model
│   ├── debt.js               payoff dates, avalanche ordering, interest saved
│   ├── goals.js              what each goal costs, and the emergency fund
│   └── networth.js           assets against debts
│
├── docs/                     system design and the debugging guide
├── .github/workflows/ci.yml  runs every test, lint and build on each push
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

**Every number comes from one function.** `summariseFinances` in
`shared/finances.js` builds the plan, the monthly costs, the safety net and the
chosen scenario. The browser reaches it through `lib/loadFinances.js` and the
server through `lib/snapshot.js`. Before this, five places built the plan and
they had drifted: the goals page could show a different monthly saving from the
dashboard, and the safety net left out rent. Both are now regression tests.

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

## Reading a bank statement

Everything else in this app is built from numbers somebody typed. `/spending`
is built from their bank's own record, which is the only honest way to know
what a month actually cost. Nobody remembers what they spent on food.

Upload a CSV and it is parsed, sorted into categories, and added up. There is a
sample month behind a button, because nobody has a statement to hand the first
time they open the page and an upload box with nothing to upload is a dead end.

**The parser assumes no layout.** Every bank exports a different shape. Some
have one Amount column and a separate Dr/Cr marker, some have Withdrawal and
Deposit as two columns, and the date is `05/01/2026` or `05-Jan-26` or
`2026-01-05`. The header row is rarely the first line, because banks print the
account number and a date range above it. So `lib/statement.js` hunts for the
header, works out which column is which from the words in it, and reads the rest
against that.

**Day comes before month.** `05/01/2026` is read as the fifth of January. There
is no way to tell from the text, so it is a decision rather than a deduction,
and it is written down in a comment and in a test because a silently wrong month
pushes transactions into the wrong check-in with nothing on screen looking odd.

**Importing the same file twice adds nothing.** Each line gets a fingerprint:
a hash of its date, description, amount, direction, and how many identical lines
came before it in the same file. That last part is what keeps two ₹420 Swiggy
orders on the same day as two payments rather than one. The column has a UNIQUE
index and the insert says `INSERT OR IGNORE`, so the database enforces it rather
than a check-then-insert, which has a gap between the two halves.

**Categories are rules, not an AI.** It would be one prompt to hand every line
to a model. Rules win here: they are instant where a model is a network round
trip per statement, they cost nothing, and they give the same answer every time,
so a category somebody corrects once is not guessed differently next month. The
trade is that an unknown merchant falls through to "everything else", and the
answer to that is to let people fix it rather than to guess harder.

**Investing is not spending.** A SIP leaving the account is money moved into
something you still own. Counting it as an expense would report the worst
spending month on the month somebody saved the most, which is the opposite of
useful. The spending total is built from the spending categories only.

---

## The note nobody asked for

The coach card answers questions. Useful, and it only ever tells you what you
already thought to ask. A month where the food spend doubled is not a question
anybody types.

So there is a second thing on the dashboard that writes itself, and the way it
is split in two is the whole design.

`lib/signals.js` finds what is true. Each finding is a query with a number
attached: a category up or down against last month, a debt over 15%, one payment
that was a quarter of everything that left the account, a check-in where almost
nothing was kept. It either happened or it did not, and the same data gives the
same findings every time, which is what makes it testable.

`lib/briefing.js` turns those findings into sentences, and that is the only job
the model has.

A model asked to do both would decide what is true and how to say it at the same
time, so a misreading and a well-written sentence would arrive together and be
indistinguishable. It would also say something different on every run against
identical data.

It is written once a day and stored, not on every page load, because writing it
costs a call to a model and wording that changed on every refresh would read as
noise rather than as something that had been noticed. With no key configured the
findings are shown as they are, which is why they are written as whole sentences
with their amounts formatted: the no-model version should not be the rough
draft.

---

## Two themes

Every colour on the site is a CSS variable, defined twice in
`frontend/src/styles/global.css`: once on `:root` and once under
`[data-theme="dark"]`. `tailwind.config.js` still owns the names and the
reasoning, and every class points at a variable.

That means `data-theme="dark"` on the `<html>` tag changes the whole app, and
not one component knows a dark theme exists. A `bg-accent text-paper` button is
dark green with cream text in one and mint with near-black text in the other,
because both halves flip together.

Three things did not come free.

**The values had to leave the config file.** A hex code written in
`tailwind.config.js` is baked into the stylesheet at build time, and a baked
value cannot be changed while the page is open.

**They are stored split into red, green and blue** rather than as `#1F5340`,
because that is what lets `border-accent/25` work: Tailwind substitutes the
opacity into the middle of `rgb(31 83 64 / 0.25)`, and a hex code cannot be
sliced open like that.

**Some colours must not flip.** The dark panels on the landing page are
near-black in both themes, so the writing on them stays cream in both. That is a
separate name, `onNight`, rather than `paper`, which would have looked correct
until the dark theme turned it near-black on near-black.

The theme is applied by a small script in `index.html` that runs before the
page is drawn. Waiting for React would paint the cream page first and repaint it
black a moment later, and that white flash is the most noticeable bug a dark
mode can have.

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
- **The AI key never leaves the server.** It lives in `backend/.env`, which git
  ignores, and only the files in `backend/src/lib/ai/` read it. A key in frontend
  code is a key anybody can read in their browser and spend money with. Nothing
  in the browser even names which model is answering, because the server decides
  that from whichever key is set. The AI route is rate limited to 20 questions an
  hour per person.
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

## Which AI

Two are supported and the app behaves the same with either. **Gemini has a free
allowance, so it is the default**; Claude is there because it was first and
because having two proves the seam is real.

The interesting part is that the agent loop is written once. `lib/advice.js`
keeps the conversation in a shape neither provider uses:

```
{ role, text }          somebody said something
{ toolCalls: [...] }    the model asked for a calculation
{ toolResults: [...] }  we ran it, here is the answer
```

`lib/ai/gemini.js` and `lib/ai/claude.js` translate that to their own wire
formats, which differ more than you would expect: Gemini calls the two sides
"user" and "model" where Claude says "assistant", puts the system prompt in its
own field, needs UPPERCASE type names in a tool schema, and rejects a tool whose
parameters are an empty object rather than absent. All of that is in the
translators; none of it is in the loop.

The Gemini tests run against a stand-in server rather than Google, so they cost
nothing, need no key, and still catch a wrongly shaped request, which is the
thing most likely to be wrong.

---

## The charts

Five, and the type of each was picked from the job it does rather than from what
looks impressive.

| What the reader has to do | The chart |
|---|---|
| See where one month's money goes | a stacked bar, part-to-whole |
| Compare four plans over fifteen years | multi-line, one axis |
| See how much sooner the debt clears | a dumbbell, before against after |
| Judge one number against a target | a meter, not a chart |
| Compare twelve spending categories | sorted horizontal bars |

The last one is a bar chart and not a pie for a specific reason. The question is
"which of these is biggest, and by how much", and length along a shared baseline
is the one thing the eye compares accurately. Angles are not: two slices within
a few per cent of each other are indistinguishable, and twelve categories is far
past the three or four a pie can carry. All twelve bars are one colour, because
each is named beside itself, so colour has no work left to do.

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

Every chart colour has a dark-theme version, and they are not the light ones
dimmed. Each was lifted separately into the band where it stays separable
against a dark card. The percentage printed inside a bar has two colours for the
same reason: the fills deep enough to need white text on the light theme are
lifted light enough on the dark one to need near-black.

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

It shoots four pages, at three widths, in both themes. Both themes matter: the
dark one is not a filter over the light one, every colour in it was chosen
separately, and it can break on its own. Text vanishing into its own background,
a shadow that was doing the work of a border, a chart label on a fill it no
longer contrasts with. All three happened while it was being built and none of
them is something a component test can see.

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
- **The AI needs a key** in `backend/.env`, either Gemini's or Anthropic's.
  Without one the coach card says so, and the daily note falls back to showing
  its findings as they are, which is why they are written as whole sentences.
- **The daily note is written on the first dashboard load of the day**, not by a
  job running overnight. A nightly job would have to write a note for every
  account whether or not anybody was going to read it, and would need something
  to run it. The cost of doing it this way is that one page load a day waits for
  the model.
- **Statements are imported by hand.** The real version of this is India's
  Account Aggregator framework, where a bank sends the data directly with the
  account holder's consent. That needs a licensed aggregator and paperwork, so
  what is here is the same idea with a CSV in the middle.
- **The stress test is a model, not a forecast.** It assumes everyday spending
  halves in a crisis, investing pauses, and health cover leaves 20% of a bill
  to pay. Each assumption is a named constant in `shared/shocks.js` and is
  printed on the page.
- **A merchant nobody has written a rule for** lands in "everything else". The
  page says how many did and lets them be corrected one at a time.
- **A language model can be confidently wrong.** Every figure it is shown is read
  out of the database and summed in JavaScript first, and it is told never to
  invent one, but nothing stops it drawing a poor conclusion from correct
  numbers. It is a second opinion on the arithmetic, not the arithmetic.
- **Rate limit counts live in memory**, so they reset when the server restarts
  and would need Redis if the app ever ran as more than one copy.
- **The browser check is not a test.** The component tests run in jsdom, which
  cannot see layout. `npm run shots` does drive a real browser and reports
  overflow and clipped text, but it is not part of `npm test`, and deciding
  whether a page looks right still means looking at the screenshots.

---

Educational guidance, not regulated investment advice.
