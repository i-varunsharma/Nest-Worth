/*
  Shows an error from the server in the right place on a form.

  When the server names a field (for example "email" for "that email is
  already taken"), the message goes under that input. Otherwise it goes above
  the form, because it is about the whole attempt (a wrong password, the server
  being down).

    const result = await api.login(email, password);
    if (result.ok === false) {
      showServerError(result, setErrors, setFormError);
      return;
    }
*/
export function showServerError(result, setErrors, setFormError) {
  if (result.field) {
    const fieldErrors = {};
    fieldErrors[result.field] = result.error;
    setErrors(fieldErrors);
    return;
  }

  setFormError(result.error);
}
