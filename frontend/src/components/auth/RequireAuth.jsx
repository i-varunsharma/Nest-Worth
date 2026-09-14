import { Navigate } from 'react-router-dom';
import useAsyncData from '../../hooks/useAsyncData';
import * as api from '../../lib/api';

/*
  Wraps a page that needs somebody signed in, and hands that user to the page:

    <RequireAuth>
      {(user) => <DashboardPage user={user} />}
    </RequireAuth>

  The function between the tags is a "render prop": this component finds out who
  is signed in and passes the user down, so the page does not ask again.

  This only decides what to show. The data is protected by requireUser on the
  server, which refuses any request without a valid session.
*/
export default function RequireAuth({ children }) {
  const session = useAsyncData(api.me);

  if (session.error) {
    // replace swaps the history entry, so Back does not return to this page.
    return <Navigate to="/login" replace />;
  }

  // Without this state the login screen would flash before the answer arrives.
  if (session.data === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-[14px] text-muted">Loading your plan…</p>
      </div>
    );
  }

  return children(session.data.user);
}
