# Setup

Two parts to run: the API in `backend/`, and the React app in `frontend/`.

Everything below the first section is optional. Sign up, sign in, the phone code
and the saved household all work without any of it.

---

## 1. Run it (about two minutes)

Open two terminals.

**Terminal one, the API:**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

You should see `Nestworth API running` on port 4000.

**Terminal two, the app:**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and create an account. That is it. There is no
database server to install: SQLite keeps everything in the single file
`backend/data/nestworth.db`, which is created on first run and ignored by git.

**To sign in with a phone number**, type any valid Indian mobile number and press
Send code. There is no SMS provider connected, so the six digit code is **printed
in the terminal running the API**, in a box you cannot miss. Type it in and you
are signed in. That is a deliberate stand-in, not a bug: the code is never sent
back to the browser, because a code the browser can read proves nothing.

---

## 2. What works right now

| Feature | State |
|---|---|
| Sign up with name, email, password | Working |
| Sign in with email and password | Working |
| Sign in or sign up with a phone code | Working, code printed to the API terminal |
| Forgot password | Working, link printed to the API terminal |
| Stay signed in after a refresh | Working |
| Sign out | Working |
| Onboarding questions saved to the database | Working |
| Plan adapts to a variable (freelance) income | Working |
| Debts, goals, assets and monthly check-ins | Working |
| Rate limiting on sign-in and sign-up | Working |
| Change your password while signed in | Working, on the settings page |
| Delete your account and everything in it | Working, on the settings page |
| Progress against the plan, from your check-ins | Working, on the dashboard |
| Plan subtracts real rent and bills before splitting | Working |
| Backend tests (`npm test` in `backend/`) | Working, 54 of them |
| Frontend tests (`npm test` in `frontend/`) | Working, 51 of them |
| Continue with Google | Code is finished, needs a client id: section 3 |
| Real text messages | Needs section 4 |
| Real password reset emails | Needs section 5 |

Passwords are hashed with bcrypt at cost 12 and never stored or logged in plain
text. The session is a random 256-bit token in an `httpOnly` cookie, so page
JavaScript cannot read it. One-time codes and reset links are stored hashed,
expire, and are destroyed the moment they are used.

**To try the forgot-password flow**, press "Forgot password?" on the login
screen and enter the email you signed up with. As with the phone code, there is
no email provider connected, so the reset link is **printed in the terminal
running the API**. Copy it into your browser.

---

## 3. Continue with Google

The code for this is finished on both sides. All it needs is a client id.

1. Go to `console.cloud.google.com` and create a project. Call it Nestworth.
2. Open **APIs and Services → OAuth consent screen**.
   - User type: **External**.
   - Fill in the app name, your support email and a developer contact email.
   - Scopes: add only `email`, `profile` and `openid`. Every extra scope makes
     Google's review slower and makes users more suspicious.
   - While it is in **Testing**, only accounts you list as test users can sign
     in. Add your own Gmail address.
3. Open **Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorised JavaScript origins**: add `http://localhost:5173`, and your
     real domain later. No trailing slash.
4. Copy the **Client ID**. It looks like `1234-abcd.apps.googleusercontent.com`.
5. Put it in **both** files, because both sides need it. The browser needs it to
   open the right sign-in window, and the server needs it to check that the token
   it receives was really issued for this app:

   ```
   backend/.env          GOOGLE_CLIENT_ID=1234-abcd.apps.googleusercontent.com
   frontend/.env.local   VITE_GOOGLE_CLIENT_ID=1234-abcd.apps.googleusercontent.com
   ```

   The Client ID is not a secret and is safe in the frontend. The **client
   secret** is a secret, is not needed for this flow, and must never go in
   `frontend/`.
6. Restart both servers so they pick up the new files.
7. When you are ready for real users, go back to the consent screen and press
   **Publish app**.

No code changes are needed. The `GoogleButton` component already loads Google's
script, draws their button and passes the token back, and `POST /api/auth/google`
already verifies that token with Google and checks it was issued for this app.
Until a client id is set, the button renders a short message explaining that,
rather than failing silently.

---

## 4. Real text messages

Right now codes appear in your terminal. To send actual SMS in India there is
paperwork before there is code, and **it takes several days**, so start it early.

### The paperwork: DLT

TRAI, the Indian telecom regulator, requires every SMS sender to be registered
under DLT. There is no way around it.

1. Register your **entity** on any operator's DLT portal (Jio, Airtel, Vi or
   BSNL). Registering with one is enough, they share the record. You will need
   business documents and a PAN.
2. Register a **header**, also called a sender ID. This is the six characters
   that appear as the sender, such as `NSTWRT`.
3. Register a **template**. The exact wording must be approved in advance, with
   variables marked:

   ```
   {#var#} is your Nestworth verification code. It expires in 10 minutes.
   ```

   Messages that do not match an approved template are **silently dropped by the
   carriers**. This catches almost everybody the first time.

### Then pick who sends them

| Provider | Good for | Watch out for |
|---|---|---|
| **MSG91** | India, cheapest per message, handles DLT well | Mainly Indian numbers |
| **Twilio Verify** | Easy, worldwide, manages codes for you | More expensive per SMS |
| **Firebase Phone Auth** | Quickest to wire up | Forces a reCAPTCHA step, needs billing enabled |

For an Indian product, **MSG91 is usually the right choice**.

1. Create the account and finish their verification.
2. Connect your DLT header and template in their dashboard.
3. Copy the **API key** into `backend/.env`. It stays on the server. An SMS API
   key in frontend code is a key anybody can use to spend your money.

### The code change

One function. Open `backend/src/lib/otp.js` and replace the body of `deliver()`
with a call to your provider. Everything else, the hashing, the expiry, the
attempt limit and the resend wait, already works and does not change.

---

## 5. Real password reset emails

Right now the reset link is printed in your terminal. Sending it for real is the
easier of the two providers, because email has no equivalent of India's DLT
paperwork: you can be sending within an hour.

### Pick who sends them

| Provider | Good for | Watch out for |
|---|---|---|
| **Resend** | Simplest to start, generous free tier | Newer company |
| **Postmark** | Best delivery record for this kind of mail | Paid from the start |
| **Amazon SES** | Cheapest at volume | Fiddly setup, starts in a sandbox |

For a project this size, **Resend** is usually the right choice.

1. Create the account and add your domain.
2. Add the **DNS records** they give you: SPF, DKIM and DMARC. This step is not
   optional. Mail sent without them lands in spam, and a password reset that
   lands in spam is the same as a password reset that never arrives.
3. Copy the **API key** into `backend/.env`. It stays on the server, for the
   same reason the SMS key does.

### The code change

One function, exactly as with SMS. Open `backend/src/lib/passwordReset.js` and
replace the body of `deliver()` with a call to your provider. Everything else —
the hashing, the one hour expiry, the resend wait, destroying the token after
use and signing out every other browser — already works and does not change.

Two things worth getting right in the email itself:

- **Say how long the link lasts**, so somebody who opens it the next morning
  understands why it failed rather than assuming your site is broken.
- **Do not put anything secret in it besides the link.** The link is the secret,
  and it is already enough.

---

## 6. Before this goes on the internet

Three of the items that used to be on this list are now done: the repository is
clean, sign-in is rate limited, and the password reset exists. What is left is
about deployment.

1. **Set `NODE_ENV=production`.** This is what switches the session cookie to
   `secure`, meaning the browser only ever sends it over HTTPS. Forget it and
   people will silently fail to stay signed in.

2. **Set `CLIENT_ORIGIN`** in `backend/.env` to your real domain. It is the list
   of sites allowed to call the API, and it is also what password reset links
   are built from. Leaving it as localhost blocks your own site and produces
   reset links that go nowhere.

3. **Never set `DISABLE_RATE_LIMIT`.** It exists only so the test suite can make
   thirty accounts in two seconds. On a real server it is the one thing standing
   between your users' passwords and a script.

4. **Move the database off the disk that gets replaced.** Many hosts give you a
   filesystem that is wiped on every deploy, which would take `nestworth.db`
   with it. Either mount a persistent volume and point `NESTWORTH_DB_FILE` at
   it, or move to a hosted Postgres. Every query in this project is ordinary
   SQL, so the second is a smaller job than it sounds.

5. **Back the database up.** One file makes this easy: copy it somewhere else on
   a schedule. Easy is not the same as done.

6. **Read your own logs once.** The phone code and the reset link are printed to
   the terminal by design while there is no provider connected. The moment real
   people are using this, those printouts have to become real messages, or every
   code your users receive is sitting in a log file.

---

## Checklist

**To run it**

- [ ] `cd backend && npm install && cp .env.example .env && npm run dev`
- [ ] `cd frontend && npm install && npm run dev`
- [ ] Create an account and check the dashboard appears
- [ ] Try the Phone tab and read the code from the API terminal
- [ ] Try "Forgot password?" and read the link from the API terminal
- [ ] `cd backend && npm test` and see 54 passing
- [ ] `cd frontend && npm test` and see 51 passing

**Google sign-in (section 3)**

- [ ] Google Cloud project and OAuth Client ID created
- [ ] Client ID added to both `backend/.env` and `frontend/.env.local`
- [ ] Both servers restarted

**Text messages (section 4)**

- [ ] DLT entity, header and template registered
- [ ] SMS provider account created, API key in `backend/.env`
- [ ] `deliver()` in `backend/src/lib/otp.js` calls the provider

**Email (section 5)**

- [ ] Email provider account created, domain added
- [ ] SPF, DKIM and DMARC records added to your DNS
- [ ] API key in `backend/.env`
- [ ] `deliver()` in `backend/src/lib/passwordReset.js` calls the provider

**Deploying (section 6)**

- [ ] `NODE_ENV=production` set
- [ ] `CLIENT_ORIGIN` set to the real domain
- [ ] `DISABLE_RATE_LIMIT` not set anywhere
- [ ] Database on storage that survives a deploy, and backed up
