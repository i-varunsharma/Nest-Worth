# Setup: what you have to do by hand

The Google button and the phone OTP screens are **fully built in the interface**,
but neither can actually sign anyone in yet. Both need accounts with outside
companies and a backend to talk to them. This file is the list of what only you
can do.

Nothing here can be done from inside the code. It is all account signups, console
settings and government paperwork.

---

## The one rule to remember

**Never trust the browser.** Anyone can open developer tools and change what the
page thinks. So:

- The browser may **ask** Google who you are. Only the **server** may believe the answer.
- The browser may **ask** for an OTP to be sent. Only the **server** may decide if the typed code is right.
- API keys and secrets live on the **server**. Anything in the frontend is public, even in a `.env` file.

Every step below follows from that one rule. It is also the single best thing to
be able to explain about this feature in an interview.

---

## Part 1: Continue with Google

**Where the code is waiting:** `handleGoogleClick` in
`frontend/src/pages/LoginPage.jsx` and `frontend/src/pages/SignupPage.jsx`.

### What you do

1. Go to the **Google Cloud Console** at `console.cloud.google.com` and create a
   project. Call it Nestworth.
2. Open **APIs and Services → OAuth consent screen**.
   - User type: **External**.
   - Fill in the app name, your support email and a developer contact email.
   - Scopes: add only `email`, `profile` and `openid`. Do not ask for more than
     you need, because every extra scope makes Google's review slower and makes
     users more suspicious.
   - While it is in **Testing** mode, only accounts you list as test users can
     sign in. Add your own Gmail address here.
3. Open **Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorised JavaScript origins**: add `http://localhost:5173` for local
     work, and your real domain later. No trailing slash.
   - **Authorised redirect URIs**: only needed if you use the redirect flow
     rather than the popup. Add your backend callback URL if so.
4. Copy the **Client ID**. It looks like `1234-abcd.apps.googleusercontent.com`.
5. Copy the **Client secret**. This goes on the **server only**, never in the
   frontend.
6. In `frontend/`, create a file called `.env.local` containing:

   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here
   ```

   Vite only exposes variables that start with `VITE_`. Everything in this file
   ships to the browser, so the Client ID may live here and the secret may not.
7. Add `.env.local` to `.gitignore` so it never reaches GitHub.
8. When you are ready for real users, go back to the consent screen and press
   **Publish app**. Until you do, only your listed test accounts can sign in.

### What still has to be built

- A backend route, for example `POST /api/auth/google`, that receives the ID
  token from the browser and **verifies it with Google** before trusting it. Use
  Google's `google-auth-library` for this. Verifying means checking the
  signature, the `aud` matches your Client ID, and the token has not expired.
- Decide what happens when a Google email matches an existing password account.
  Linking them is usually right, but do it deliberately rather than by accident.

---

## Part 2: Phone number and OTP

**Where the code is waiting:** the comments marked `SEND THE CODE` and
`CHECK THE CODE` in `frontend/src/components/auth/PhoneOtpForm.jsx`.

### Step A: the India-specific paperwork, start this first

To send SMS to Indian numbers you must be registered under **DLT**, which is a
rule from TRAI, the Indian telecom regulator. There is no way around it and
**it takes several days**, so begin here rather than last.

1. Register your **entity** on any operator's DLT portal (Jio, Airtel, Vi or BSNL).
   Registering with one is enough, they share the record. You will need business
   documents and a PAN.
2. Register a **header**, also called a sender ID. This is the six characters that
   appear as the sender, such as `NSTWRT`.
3. Register a **template**. The exact wording of your message must be approved in
   advance, with variables marked. For example:

   ```
   {#var#} is your Nestworth verification code. It expires in 10 minutes.
   ```

   Messages that do not match an approved template are **silently dropped by the
   carriers**. This surprises almost everyone the first time.

### Step B: pick who actually sends the message

| Provider | Good for | Watch out for |
|---|---|---|
| **MSG91** | India, cheapest per message, handles DLT well | Indian numbers mainly |
| **Twilio Verify** | Easy, worldwide, manages codes for you | More expensive per SMS |
| **Firebase Phone Auth** | Fastest to wire up, free tier | Forces a reCAPTCHA step, needs billing enabled beyond the free quota |

For an Indian product, **MSG91 is usually the sensible choice**. If you want the
quickest thing that works for a demo, Firebase is fine.

1. Create the account and finish their verification.
2. Connect your DLT header and template inside their dashboard.
3. Copy the **API key**. It goes in the backend's environment, never the frontend.
4. Add some credit. Most providers give free trial messages to start.

### What still has to be built

Two backend routes, and every one of these rules matters:

**`POST /api/auth/otp/send`**
- Generate a random 6 digit code on the **server**.
- Store a **hash** of it, not the code itself, alongside the phone number and an
  expiry timestamp. If your database leaks, plain codes would be usable.
- Expire it after **5 to 10 minutes**.
- **Rate limit hard.** At most 3 sends per number per hour, and a separate limit
  per IP address. Without this, someone can loop the endpoint and run up a real
  bill on your card overnight. This is the most common way a hobby project gets
  an unpleasant invoice.
- **Never** put the code in the response body, and never write it to a log.

**`POST /api/auth/otp/verify`**
- Compare the hash of what was typed against what was stored.
- Allow at most **5 wrong attempts**, then invalidate the code and make them
  request a new one. Six digits is only a million options, so unlimited guessing
  breaks it in minutes.
- Delete the code once it is used, so the same one cannot be replayed.
- Only now issue a session or token.

---

## Part 3: things worth doing for both

1. **Sessions.** Decide between a signed cookie and a JWT before you build either
   route, since the choice affects both. An `httpOnly` cookie is the safer
   default because JavaScript cannot read it.
2. **The `.gitignore` problem.** The repository currently tracks
   `backend/node_modules`, which should never be in version control. Fix it with:

   ```bash
   printf 'node_modules/\ndist/\n.DS_Store\n*.log\n.env\n.env.local\n' > .gitignore
   git rm -r --cached backend/node_modules -q
   ```
3. **HTTPS in production.** Google will refuse to run the sign-in flow on a plain
   `http://` origin that is not localhost.

---

## Quick checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen filled in, your email added as a test user
- [ ] OAuth Client ID created, `http://localhost:5173` added as an origin
- [ ] `frontend/.env.local` created with `VITE_GOOGLE_CLIENT_ID`
- [ ] `.gitignore` written, `backend/node_modules` untracked
- [ ] DLT entity registered
- [ ] DLT header and message template approved
- [ ] SMS provider account created and credit added
- [ ] Backend: verify Google token server side
- [ ] Backend: OTP send route, with hashing, expiry and rate limiting
- [ ] Backend: OTP verify route, with an attempt limit
