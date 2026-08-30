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
| Stay signed in after a refresh | Working |
| Sign out | Working |
| Onboarding questions saved to the database | Working |
| Dashboard reads the saved household | Working |
| Continue with Google | Needs section 3 |
| Real text messages | Needs section 4 |

Passwords are hashed with bcrypt at cost 12 and never stored or logged in plain
text. The session is a random 256-bit token in an `httpOnly` cookie, so page
JavaScript cannot read it. One-time codes are stored hashed, expire after ten
minutes, and are destroyed after five wrong guesses.

---

## 3. Continue with Google

**Where the code is waiting:** `handleGoogleClick` in
`frontend/src/pages/LoginPage.jsx` and `SignupPage.jsx`, and the
`POST /api/auth/google` route in `backend/src/routes/auth.js`. The server side is
already written, including the token check. It only needs a client id.

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
7. Add Google's sign-in script to `frontend/index.html` and call it from
   `handleGoogleClick`, passing the token it returns to `api.google(token)`.
   This is the one piece of code still to write, and it is about fifteen lines.
8. When you are ready for real users, go back to the consent screen and press
   **Publish app**.

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

## 5. Before this goes on the internet

1. **Fix the repository.** `backend/node_modules` is currently committed, which
   it should never be:

   ```bash
   printf 'node_modules/\ndist/\n.DS_Store\n*.log\n.env\n.env.local\n' > .gitignore
   git rm -r --cached backend/node_modules -q
   ```

2. **Rate limit the login route.** The OTP routes are limited, but
   `POST /api/auth/login` is not, so passwords can be guessed as fast as the
   network allows. `express-rate-limit` fixes this in about five lines.

3. **HTTPS.** The session cookie already switches to `secure` when
   `NODE_ENV=production`, which means it will only be sent over HTTPS. Set that
   variable when you deploy, or people will silently fail to stay signed in.

4. **Set `CLIENT_ORIGIN`** in `backend/.env` to your real domain. It is the list
   of sites allowed to call the API, and leaving it as localhost will block your
   own site.

5. **Add a password reset.** "Forgot password?" on the login page is currently a
   link to nowhere. The pattern is the same as the OTP flow: a random token,
   hashed and stored, emailed as a link, expiring in an hour.

---

## Checklist

- [ ] `cd backend && npm install && cp .env.example .env && npm run dev`
- [ ] `cd frontend && npm install && npm run dev`
- [ ] Create an account and check the dashboard appears
- [ ] Try the Phone tab and read the code from the API terminal
- [ ] `.gitignore` written, `backend/node_modules` untracked
- [ ] Google Cloud project and OAuth Client ID created
- [ ] Client ID added to both `backend/.env` and `frontend/.env.local`
- [ ] Google sign-in script wired into `handleGoogleClick`
- [ ] DLT entity, header and template registered
- [ ] SMS provider account created, API key in `backend/.env`
- [ ] `deliver()` in `backend/src/lib/otp.js` calls the provider
- [ ] Rate limit added to the login route
