# Nest-Worth — frontend

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
├── pages/          one file per address. These hold the state
├── components/
│   ├── shared/     Button, TextField, Container. Used on every screen
│   ├── layout/     navbar and footer
│   ├── landing/    the marketing page
│   ├── auth/       sign-in, sign-up, password reset screens
│   └── app/        the signed-in screens
├── lib/            plain functions. No React in here at all
├── hooks/          reusable bits of React behaviour
└── styles/         one global stylesheet, kept deliberately thin
```

**Pages hold state, components take props.** A page owns the data for a screen
and passes pieces of it down. A component in `components/` reads what it is
given and reports back through a callback, which is what makes the same
`TextField` usable on six different screens.

**Nothing in `lib/` imports React.** Those files take numbers and return
numbers: payoff dates, monthly costs, net worth, the recommendation model. Being
plain functions means you can reason about them, and later test them, without a
component anywhere near.

**One file talks to the backend.** Every request goes through `lib/api.js`, so a
page says `api.login(email, password)` and never thinks about URLs, headers or
cookies. When something about the API changes, there is one file to edit.

---

## Two things worth knowing before editing

**The theme is not in the components.** Every colour, font, shadow and animation
timing is defined in `tailwind.config.js`, with a comment explaining each choice.
Use `text-ink`, `bg-paper`, `border-line` and so on rather than a raw hex code,
so a change to the theme reaches the whole site at once. If a value genuinely
cannot be a Tailwind class — an SVG stroke, say — put it in a named constant with
a comment naming the theme colour it copies.

**Checks here are for the person, not for the data.** `lib/validation.js` catches
a missing `@` before anyone waits on the network. It is not security, and it is
not meant to be: anyone can bypass this app entirely and post straight at the API.
The rules that actually protect anything are the ones in the backend's
`lib/validate.js`, and those two files are meant to be a pair.

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
