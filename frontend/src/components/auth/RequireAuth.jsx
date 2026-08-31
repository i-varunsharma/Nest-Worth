import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as api from '../../lib/api';

/*
  Wraps any page that only makes sense when somebody is signed in.

    <RequireAuth>
      {(user) => <DashboardPage user={user} />}
    </RequireAuth>

  Writing a function between the tags is a React pattern called a render prop.
  It is here because this component is the one that finds out who is signed in,
  and a function is how it passes that user down, so the page does not have to
  ask the server again.

  There are three states, and the "checking" one matters: without it the page
  flashes the login screen for a moment before the answer arrives.

  This decides what to show. It is not security. Anyone can edit their own
  browser to skip it, and what actually protects the data is requireUser on the
  server, which refuses to answer without a valid session cookie.
*/
export default function RequireAuth({ children }) {
  // 'checking' while we wait, then 'in' or 'out'.
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // React 18 and later run effects twice in development to help spot bugs.
    // This flag stops a slow answer arriving after the component has gone and
    // trying to update state that no longer exists.
    let stillMounted = true;

    api.me().then((result) => {
      if (!stillMounted) {
        return;
      }

      if (result.ok) {
        setUser(result.data.user);
        setStatus('in');
      } else {
        setStatus('out');
      }
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-[14px] text-muted">Loading your plan…</p>
      </div>
    );
  }

  if (status === 'out') {
    // replace swaps this history entry rather than adding one, so Back does not
    // bounce between the two pages.
    return <Navigate to="/login" replace />;
  }

  // Signed in. Call the function written between the tags, passing the user.
  return children(user);
}
