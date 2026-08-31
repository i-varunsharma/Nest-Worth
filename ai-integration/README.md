# AI integration (not built yet)

This folder is a placeholder. Nothing here runs, and nothing in the app imports
from it. It exists so the plan for the next feature has an obvious home.

## The idea

Nest-Worth already knows a lot about one person: their income, how many people
depend on them, every debt with its interest rate, what they are saving for and
what they own. Today the app turns that into numbers. The next step is turning
it into a paragraph of plain advice, written for someone who does not enjoy
spreadsheets.

For example, instead of only showing that a credit card at 38% should be cleared
before a home loan at 8.4%, the app could explain *why* in a sentence, and say
what that choice costs or saves over a year.

## How it would be built

Follow the shape the rest of the backend already uses, so there is nothing new
to learn:

1. `backend/src/lib/advice.js` — builds the prompt from the user's real rows and
   calls the model. This is the only file that talks to the AI provider.
2. `backend/src/routes/advice.js` — a `POST /api/advice` route behind
   `requireUser`, exactly like `routes/debts.js`.
3. `frontend/src/lib/api.js` — one more function, `getAdvice()`.
4. A page or a card that shows the answer.

## Two rules to keep

**The API key stays on the server.** It goes in `backend/.env`, which git
ignores. A key in frontend code is a key anybody can read in their browser and
spend your money with. This is the same reason the SMS key stays on the server.

**Rate limit it.** Every request costs real money, so it needs the same
treatment as the OTP route: a limit per user, per hour. `lib/rateLimit.js`
already does this and can be reused as it is.

## What to be careful about

A language model will state a wrong number with complete confidence. Anything
that must be correct — a payoff date, an interest total, a monthly figure —
should be calculated in JavaScript and passed *into* the prompt, never asked
for from the model. The model's job is to explain the numbers, not to produce
them.
