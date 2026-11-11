import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

/*
  What happens after the Google button gives us a credential. Used by both the
  login and the signup page, which had the same code twice before.

    const handleGoogleCredential = useGoogleSignIn(setFormError, setIsBusy);
    <GoogleButton onCredential={handleGoogleCredential} />

  The page passes in its own setters, because the page owns the error message
  and the busy flag (the email form uses them too).

  The server checks the credential with Google. isNew means the account was
  just made and has no household yet, so it goes to onboarding.
*/
export default function useGoogleSignIn(setFormError, setIsBusy) {
  const navigate = useNavigate();

  async function handleGoogleCredential(credential) {
    setFormError('');
    setIsBusy(true);

    const result = await api.google(credential);

    setIsBusy(false);

    if (result.ok === false) {
      setFormError(result.error);
      return;
    }

    if (result.data.isNew === true) {
      navigate('/onboarding');
      return;
    }

    navigate('/dashboard');
  }

  return handleGoogleCredential;
}
