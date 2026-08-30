import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as api from '../../lib/api';

/*
  RequireAuth
  -----------
  Wraps any page that only makes sense when somebody is signed in.

    <RequireAuth>
      {(user) => <DashboardPage user={user} />}
    </RequireAuth>

  Writing a function between the tags rather than a plain tag looks unusual the
  first time. It is a normal React pattern with a name, a "render prop", and the
  reason for it is simple: this component is the one that finds out who is
  signed in, and a function is how it hands that answer down to the page. The
  page then never has to ask the server a second time.

  It asks the server "who am I?" when it loads, and then does one of three
  things. The three states matter: without the "checking" one, the page would
  flash the login screen for a moment before the answer came back, which looks
  broken even when it is working.

  Worth being clear about what this does and does not do. This is a CONVENIENCE,
  not a security measure. It decides what to show, and anyone can edit their own
  browser to skip it. The thing that actually protects data is requireUser on the
  server, which refuses to answer without a valid session cookie. A guard in the
  browser is a signpost, not a lock.

  The signed-in user is handed to the page as a prop, so the page does not have
  to ask for it a second time.
*/
export default function RequireAuth({ children }) {
  // 'checking' while we wait, then 'in' or 'out'.
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // React 18 and later run effects twice in development to help spot bugs.
    // This flag makes sure a slow answer that arrives after the component has
    // gone does not try to update state that no longer exists.
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
    // "replace" swaps this entry in the browser history rather than adding one,
    // so pressing Back does not bounce between the two pages.
    return <Navigate to="/login" replace />;
  }

  // Signed in. Call the function that was written between the tags, handing it
  // the user, and show whatever it gives back.
  return children(user);
}
