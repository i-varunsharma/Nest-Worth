# AI integration

This folder is notes only. Nothing here runs, and nothing imports from it. The
feature itself lives in the files listed below.

## What was built

A coach on the dashboard that can work things out rather than only talk about
them. Ask it "what if I paid ₹3,000 more on the card?" and it runs the app's own
payoff simulation and answers from the result.

```
frontend/src/components/app/CoachCard.jsx   the conversation, streamed
frontend/src/lib/api.js                     askCoach(), reads the stream
        |
        |  POST /api/advice   { question, history }
        v
backend/src/routes/advice.js                auth, rate limit, Server-Sent Events
backend/src/lib/advice.js                   the agent loop, streaming
backend/src/lib/tools.js                    what the model is allowed to run
backend/src/lib/ai/index.js                 picks Gemini or Claude from the keys set
backend/src/lib/ai/gemini.js                Gemini, over plain fetch
backend/src/lib/ai/claude.js                Claude, over @anthropic-ai/sdk
        |
        v
shared/plan.js  shared/debt.js  shared/goals.js  shared/networth.js
        ^
        |
frontend/src/lib/*                          the same files draw the dashboard
```

Two models are supported. Gemini (`gemini-3.8-flash` by default) has a free
allowance, so it is used when its key is set. Claude (`claude-opus-5`) is used
when only the Anthropic key is set. `AI_PROVIDER` in `backend/.env` can force
either. `SETUP.md` section 4 covers getting a key.

## The agent loop

`askClaude` in `lib/advice.js` runs the loop. The name is from when Claude was
the only provider; it now calls whichever one `ai/index.js` picks.

1. Send the conversation and the list of tools.
2. The model streams back text, and may also ask to run one or more tools.
3. If it asked, run them, put the results in the conversation, go round again.
4. If it did not ask, it has finished.

It is written out by hand rather than using the SDK helper that does the same
job, for two reasons. The loop is the feature, so hiding it inside a library
call would hide the thing worth understanding. And running it ourselves is what
lets the server tell the browser which tool is running, so the card can say
"running the numbers on your credit card" instead of sitting still.

There is a cap of five rounds. A loop with no end is a loop that spends money
forever.

## Why there are tools at all

The first version handed Claude a fixed block of numbers and asked for a
paragraph. That works, and it is safe, but it can only ever describe what is
already on the screen.

With tools, the model decides what it needs to know. Seven are available:

| Tool | What it runs |
|---|---|
| `simulate_extra_payment` | the real payoff loop, on one of their debts |
| `simulate_household_change` | the recommendation model, with income, rent or family support changed |
| `check_goals` | whether the goals fit inside what the plan saves |
| `compare_plans` | every plan played out fifteen years, for "what should I do" questions |
| `spending_trend` | the recorded check-ins: share kept, running total, best and worst month |
| `emergency_fund` | months of cover, against the target for this household |
| `stress_test` | a job loss, pay cut, hospital bill or family need, walked month by month |

Every tool that needs the plan gets it from `readFinances` in `lib/snapshot.js`,
the same `shared/finances.js` function the pages use.

Two things follow.

**The coach cannot contradict the app.** Every tool calls the code in `shared/`,
which is the same code the dashboard draws with. There is one payoff function,
so there is one payoff date. That is why those files moved out of
`frontend/src/lib/` and why the frontend now re-exports them: two copies would
eventually disagree, and there would be no way to tell which was right.

**It can answer things nobody built a screen for.** There is no "what if my rent
went up ₹5,000" page, but the plan model can answer it, so the coach can.

## The rules it follows

**The API key stays on the server.** It is read from `backend/.env` inside
`lib/ai/` and nowhere else. A key in frontend code is a key anybody can
read in their browser and spend your money with.

**Claude never does the arithmetic.** It is good at knowing which calculation
matters and bad at running one. The system prompt says so, and the tools are
what it uses instead. A wrong figure stated confidently is the worst thing this
app could do.

**The browser sends only words.** It keeps the conversation, because the server
stores nothing between questions, and sends it back each time. `cleanHistory` in
`routes/advice.js` rebuilds it from scratch and drops anything that is not a
plain user or assistant turn. Tool results are never accepted from the browser:
one that could send its own could tell Claude any figure it liked and have it
repeated back as fact.

**The user id comes from the session, never from Claude.** No tool takes an
argument naming a person. That is what makes it safe rather than merely
untested, and `tests/tools.test.js` has a test whose only job is to keep it true.

**It is rate limited.** Twenty questions an hour per person, using the same
`lib/rateLimit.js` the OTP route uses. Every question costs real money, and a
question with tool rounds costs several times one without.

**Nothing happens until you press the button.** The card does not call the API
when the dashboard loads.

## Why it streams

An answer with a tool round means two or three calls to Claude, so it can take
ten seconds. Ten seconds of a spinner feels broken in a way that ten seconds of
text appearing does not.

The transport is Server-Sent Events, which is a plain HTTP response that stays
open: each event is the word `data:`, a line of JSON, and a blank line. The
browser reads it with `response.body.getReader()` in `lib/api.js`. `EventSource`
would be the usual choice and cannot be used here, because it only makes GET
requests and this one has a body.

One thing to know if you touch `routes/advice.js`: the listener watching for the
person navigating away is on the **response**, not the request. A request's
`close` event fires as soon as its body has been read, which is before any of
the work has happened. Getting that wrong made every request hang forever, with
no error anywhere. There is a test for it.

## What is deliberately not here

No stored chat history. The conversation lives in React state and is gone on
refresh. Storing it would mean another table, another thing to delete when an
account closes, and another thing to explain in the privacy answer, for a
feature people use a question or two at a time.

No prompt caching yet. The system prompt and tool definitions are stable and
would be the obvious thing to cache, but they are under the minimum size the
cache needs, so adding it today would be a line of code that quietly does
nothing.
