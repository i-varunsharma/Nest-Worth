# Nest-Worth frontend

The React app. It draws every screen and does all the arithmetic the person
sees; it stores nothing itself. Everything that has to survive a refresh goes to
the API in `../backend`.

Start the backend first, or the app will load and then tell you it cannot reach
the server.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run lint     # oxlint
```

The project README, one folder up, explains how the two halves fit together.

---

## Where things live

```
src/
├── main.jsx        hands App to React and mounts it
├── App.jsx         which page shows at which address
├── pages/          one file per address. Loads the data, arranges the sections
├── components/
│   ├── shared/     Card, Button, Notice, MoneyFigure, StatTile, form fields. Used everywhere
│   ├── layout/     app shell, sidebar, top bars, loading and error pages
│   ├── charts/     hand-drawn SVG charts
│   ├── auth/       sign-in pieces: Google button, phone code form, RequireAuth
│   ├── landing/    the marketing page
│   └── dashboard/ debts/ goals/ family/ plans/ stressTest/ spending/ ...
│                   one folder per page, holding that page's sections
├── hooks/          reusable React behaviour: useAsyncData, useRecordEditor, useGoogleSignIn ...
├── lib/            plain functions, no React
│   ├── api.js          every request to the backend
│   ├── loadFinances.js the one way a page gets its plan numbers
│   ├── format.js       money and dates as text (from shared/format.js)
│   ├── validation.js   form checks (from shared/accountFields.js)
│   ├── formErrors.js   puts a server error under the right input
│   └── plan.js debt.js goals.js ...  one line each, re-exporting shared/
└── styles/         global.css, the light and dark colour values
```

**Pages hold state, components take props.** A page owns the data for a screen
and passes pieces of it down. A component reads what it is given and reports
back through a callback, which is what makes the same `TextField` usable on six
different screens.

**Nothing in `lib/` imports React.** Those files take numbers and return
numbers or text. Most of them just re-export `../shared/`, which the backend
uses too, so the page and the AI coach can never calculate differently.

**One file talks to the backend.** Every request goes through `lib/api.js`, so a
page says `api.login(email, password)` and never thinks about URLs, headers or
cookies.

---

## Rules for where new code goes

| You are writing... | Put it in | Example |
|---|---|---|
| A calculation (money, dates, plans) | `../shared/`, then re-export from `lib/` | `summariseDebts` in `shared/debt.js` |
| How a number or date is written | `../shared/format.js` | `formatRupees`, `monthLabel` |
| A form check | `../shared/accountFields.js` (account) or `../shared/family.js` | `checkEmail` |
| A call to the backend | `lib/api.js` | `api.getDebts()` |
| State or effects reused by pages | `hooks/` | `useAsyncData` |
| A piece of UI used by more than one page | `components/shared/` | `Notice`, `MoneyFigure` |
| A section of one page | `components/<page>/` | `components/debts/DebtCard.jsx` |
| A new screen | `pages/`, plus a line in `App.jsx` and `lib/navigation.js` | `DebtsPage.jsx` |

Before writing a helper, search for it. If the same function already exists in
another component, move it to `shared/` or `components/shared/` instead of
copying it. Two copies always drift apart.

---

## Two things worth knowing before editing

**The theme is not in the components.** Every colour, font, shadow and animation
timing is defined in `tailwind.config.js`, with a comment explaining each choice.
Use `text-ink`, `bg-paper`, `border-line` and so on rather than a raw hex code,
so a change to the theme reaches the whole site at once. If a value can't be a
Tailwind class (like an SVG stroke), put it in a named constant with
a comment naming the theme colour it copies.

**Form checks here are for the person, not for security.** `lib/validation.js`
catches a missing `@` before anyone waits on the network. Anyone can skip this
app and post straight at the API, so the backend runs the same rules again
(both sides import `shared/accountFields.js`).

---

## Settings

`.env.local` is ignored by git. Copy `.env.example` if you need it.

| Setting | What it does |
|---|---|
| `VITE_API_URL` | Where the backend is. Defaults to `http://localhost:4000`. |
| `VITE_GOOGLE_CLIENT_ID` | Turns on "Continue with Google". See `../SETUP.md`. |

Vite only exposes variables that begin with `VITE_`, and it replaces them at
build time. That means anything you put here **ends up readable in the browser**,
so it is the right place for a Google client id, which is public, and the wrong
place for any kind of secret key.
