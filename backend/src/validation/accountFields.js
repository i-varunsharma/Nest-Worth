/*
  Checks for account fields: name, email, password, phone and one-time code.

  The rules live in shared/accountFields.js, so the browser's form and the
  server refuse exactly the same things. The server's check is the one that
  decides, because anyone can post to the API directly.
*/
export * from '../../../shared/accountFields.js';
