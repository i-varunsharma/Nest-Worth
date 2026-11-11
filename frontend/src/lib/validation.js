/*
  Form checks the browser runs before sending anything, so a typo is caught
  without a round trip to the server.

  The rules live in shared/accountFields.js. The server runs the very same
  functions, so a form can never accept something the API then refuses.
*/
export * from '../../../shared/accountFields.js';
