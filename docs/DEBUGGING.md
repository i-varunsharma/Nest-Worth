# Finding a bug

How to go from "something looks wrong" to the line that causes it. The system
design behind this is in `docs/SYSTEM_DESIGN.md`.

---

## 1. A number on screen is wrong

Every figure has one function that produces it. Start there, not in the page.

| What looks wrong | Function | File | Tested in |
|---|---|---|---|
| Spend, save or invest amounts | `buildPlan`, via `buildHouseholdPlan` | `shared/plan.js`, `shared/finances.js` | `backend/tests/finances.test.js`, `frontend/tests/money.test.js` |
| Which plan is shown after choosing one | `summariseFinances` | `shared/finances.js` | `finances.test.js` |
| Family support total | `summariseFamily` | `shared/family.js` | `finances.test.js` |
| Safety net months, "a month costs" | `monthlyCostsOf`, `safetyNet` | `shared/finances.js`, `shared/goals.js` | `finances.test.js` |
| Debt free date, interest | `payoff`, `summariseDebts` | `shared/debt.js` | `money.test.js` |
| Goal monthly amount, affordability | `describeGoal`, `summariseGoals` | `shared/goals.js` | `money.test.js` |
| Fifteen year plan comparison | `simulate`, `buildScenarios` | `shared/scenarios.js` | `backend/tests/scenarios.test.js` |
| Stress test cash, verdict, shortfall | `runShock` | `shared/shocks.js` | `finances.test.js` |
| Spending by category | `categorise`, summary SQL | `backend/src/services/categorise.js`, `routes/transactions.js` | `statement.test.js`, `api.test.js` |
| Averages and running totals | SQL in `insights.js` | `backend/src/reports/insights.js` | `insights.test.js` |

### Steps

1. **Look at the stored data.** `cd backend && npm run db:show`. A wrong number
   often comes from a wrong row, not wrong maths.
2. **Look at what the API sent.** Open the browser's developer tools, Network
   tab, and click the request (`/api/household`, `/api/debts`, `/api/assets`,
   `/api/family`). If the data is right here, the bug is in `shared/` or the page.
3. **Run the maths by hand** with the same input:

   ```bash
   cd backend
   node --input-type=module -e "
     import { summariseFinances } from '../shared/finances.js';
     const f = summariseFinances({
       household: { income: 85000, dependents: 2, essentialCosts: 24000, incomeVaries: false, chosenPlan: null },
       debts: [], assets: [{ kind: 'cash', value: 95000 }], family: [],
     });
     console.log(f.plan, f.monthlyCosts, f.safety);
   "
   ```

4. **Write a failing test first**, in the "Tested in" file above, using those
   same numbers. Then fix the function until it passes. Name it
   `regression: ...` so the reason stays with it.

### If two pages disagree

They should not be able to. Check that both get their numbers from
`loadFinances()` (browser) or `readFinances()` (server). A page that calls
`buildPlan` directly is the bug.

```bash
grep -rn "buildPlan(" frontend/src/pages backend/src
```

Only the landing page demo and onboarding preview should appear, since they
work on numbers the visitor has not saved yet.

---

## 2. Where a backend bug can live

Follow the request through the layers. The symptom usually tells you which one.

| Symptom | Layer | Start in |
|---|---|---|
| Wrong status or response shape | Controller | `routes/<name>.js` |
| A rule refuses good input, or accepts bad input | Validation | `validation/`, `shared/family.js` |
| Sign-in, sessions, codes or reset links misbehave | Service | `services/authService.js`, `sessionService.js`, `otpService.js` |
| Right request, wrong stored or returned row | Repository | `repositories/<name>Repository.js` |
| An average or total is wrong | Report | `reports/insights.js`, `reports/recap.js`, `reports/signals.js` |
| A setting seems ignored | Config | `config.js` |
| 500 with a request id | Anything | the stack trace next to that id in the API terminal |

## 3. The API returns an error

1. Every response has an `X-Request-Id` header. A 500 also has `requestId` in
   its body.
2. Search the API terminal for that id. The logger prints one line per request
   with the method, path, status and time, and the error handler prints the
   stack trace with the same id.
3. Reproduce with `curl`, using the session cookie from the browser's
   developer tools (Application tab, Cookies):

   ```bash
   curl -i http://localhost:4000/api/family -H "Cookie: nestworth_session=PASTE_HERE"
   ```

| Status | Usual cause | Where to look |
|---|---|---|
| 400 `invalid_request` | The body failed validation. The message says which rule. | `checkFamilyMember` in `shared/family.js`, or `backend/src/validation/` |
| 401 with `code: no_session` | Cookie missing or expired | `middleware/auth.js`, and `credentials: 'include'` in `lib/api.js` |
| 404 `not_found` on an id | The row belongs to another user, or was deleted | `repositories/ownedRecordRepository.js` |
| 429 `rate_limited` | Rate limit | `middleware/rateLimit.js` |
| 500 | A thrown error | The stack trace next to the request id |

---

## 4. A page shows an error or never loads

- Every page loads through `hooks/useAsyncData.js`. When a loader returns an
  error the page shows it instead of drawing partial data. Check the Network
  tab for the red request, then the page's loader function at the top of the
  page file.
- "Cannot reach the server" means the fetch never arrived: the API is not
  running, or `VITE_API_URL` points at the wrong place.
- Signed in but sent to `/onboarding`: the household row does not exist.

---

## 5. The AI coach says something wrong

1. Check which tool it ran. The coach card shows a line such as "Stress testing
   your savings" while a tool runs.
2. Run that tool directly against your database, without the model:

   ```bash
   cd backend
   node --input-type=module -e "
     const { runTool } = await import('./src/ai/tools.js');
     console.log(runTool(1, 'stress_test', { shock: 'job_loss', months: 4 }));
   "
   ```

   Replace `1` with your user id from `npm run db:show`.
3. If the tool's text is right, the model misread it: tighten the tool's
   description or the system prompt in `ai/prompt.js`. If the text is wrong,
   the bug is in `tools.js` or `shared/`.

| The coach card says | Cause | Look at |
|---|---|---|
| "Gemini is busy right now" | Every model returned 503 | Try again; `FALLBACK_MODELS` in `ai/providers/gemini.js` |
| "The free Gemini allowance is used up" | 5 requests a minute per model on the free tier | The API terminal shows `429` per model; turn on billing for real users |
| "The coach did not come back with an answer" | The model finished without text | The API terminal for `stopped at the token limit`; `MAX_TOKENS` in `ai/advice.js` |
| "That Gemini API key was refused" | Wrong or revoked key | `GEMINI_API_KEY` in `backend/.env`, then restart the API |

Every refusal is printed in the API terminal as `Gemini refused the request:`
with the model name and status.

---

## 6. Something looks wrong but no number is wrong

Layout, overflow, dark theme contrast:

```bash
cd frontend
npm run shots:api    # terminal one
npm run shots:web    # terminal two
npm run shots        # terminal three, saves to frontend/screenshots/
```

It reports sideways scrolling and clipped text at three sizes in both themes.

---

## 7. Before pushing

```bash
cd backend  && npm test
cd frontend && npm test && npm run lint && npm run build
```

CI runs the same commands on every push (`.github/workflows/ci.yml`).
