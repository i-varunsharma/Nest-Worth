import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../http/cookies.js';
import { validateFields } from '../http/validate.js';
import {
  checkEmail,
  checkName,
  checkOtp,
  checkPassword,
  checkPhone,
  keepOnlyDigits,
} from '../validation/accountFields.js';
import { sendCode } from '../services/otpService.js';
import { endSession } from '../services/sessionService.js';
import {
  changePassword,
  deleteAccount,
  logIn,
  logInWithGoogle,
  logInWithPhone,
  publicUser,
  requestPasswordReset,
  resetPassword,
  signUp,
} from '../services/authService.js';

/*
    POST   /api/auth/signup      email and password
    POST   /api/auth/login       email and password
    POST   /api/auth/otp/send    text a code to a mobile number
    POST   /api/auth/otp/verify  check the code, and sign in or sign up
    POST   /api/auth/google      sign in with Google
    POST   /api/auth/forgot      email a password reset link
    POST   /api/auth/reset       set a new password from that link
    POST   /api/auth/password    change the password while signed in
    DELETE /api/auth/account     delete the account and everything in it
    POST   /api/auth/logout      sign out
    GET    /api/auth/me          who is signed in

  The rules live in services/authService.js. This file checks the input, calls
  the service, and sets or clears the session cookie.
*/

const router = express.Router();

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Every route that takes a guess or sends a message is capped. A real person
// never reaches these numbers; a script reaches them in seconds.
const loginLimit = rateLimit({
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
  message: 'Too many sign-in attempts. Please wait fifteen minutes and try again.',
});

const signupLimit = rateLimit({
  limit: 5,
  windowMs: ONE_HOUR,
  message: 'Too many accounts created from here. Please try again later.',
});

const sendMessageLimit = rateLimit({
  limit: 5,
  windowMs: FIFTEEN_MINUTES,
  message: 'Too many requests. Please wait fifteen minutes and try again.',
});

const verifyLimit = rateLimit({
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
  message: 'Too many attempts. Please wait fifteen minutes and try again.',
});


/* Sets the cookie for a signed-in result and sends the user. */
function sendSignedIn(res, result, status) {
  setSessionCookie(res, result.session);

  const body = { user: publicUser(result.user) };

  if (result.isNew !== undefined) {
    body.isNew = result.isNew;
  }

  res.status(status).json(body);
}


router.post(
  '/signup',
  signupLimit,
  validateFields({ name: checkName, email: checkEmail, password: checkPassword }),
  (req, res) => {
    const result = signUp(req.body.name, req.body.email, req.body.password);
    sendSignedIn(res, result, 201);
  },
);


router.post('/login', loginLimit, (req, res) => {
  const result = logIn(req.body.email, req.body.password);
  sendSignedIn(res, result, 200);
});


router.post('/otp/send', sendMessageLimit, validateFields({ phone: checkPhone }), (req, res) => {
  sendCode(keepOnlyDigits(req.body.phone));

  // Only "sent". The code itself never leaves the server.
  res.json({ sent: true });
});


router.post(
  '/otp/verify',
  verifyLimit,
  validateFields({ phone: checkPhone, code: checkOtp }),
  (req, res) => {
    const result = logInWithPhone(keepOnlyDigits(req.body.phone), keepOnlyDigits(req.body.code));
    sendSignedIn(res, result, 200);
  },
);


router.post('/google', loginLimit, async (req, res) => {
  const result = await logInWithGoogle(req.body.credential);
  sendSignedIn(res, result, 200);
});


// Answers the same way whether or not the email has an account, so the form
// cannot be used to find out who has signed up.
router.post('/forgot', sendMessageLimit, validateFields({ email: checkEmail }), (req, res) => {
  requestPasswordReset(req.body.email);

  res.json({
    sent: true,
    message: 'If there is an account with that email, a reset link is on its way.',
  });
});


router.post('/reset', verifyLimit, validateFields({ password: checkPassword }), (req, res) => {
  const result = resetPassword(req.body.token, req.body.password);
  sendSignedIn(res, result, 200);
});


router.post(
  '/password',
  requireUser,
  verifyLimit,
  validateFields({ newPassword: checkPassword }),
  (req, res) => {
    const result = changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    sendSignedIn(res, result, 200);
  },
);


router.delete('/account', requireUser, verifyLimit, (req, res) => {
  deleteAccount(req.user.id, req.body.password, req.body.confirmText);

  clearSessionCookie(res);
  res.json({ ok: true });
});


router.post('/logout', (req, res) => {
  const token = readSessionToken(req);

  if (token) {
    endSession(token);
  }

  clearSessionCookie(res);
  res.json({ ok: true });
});


router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not signed in.', code: 'unauthorized' });
  }

  return res.json({ user: publicUser(req.user) });
});


export default router;
