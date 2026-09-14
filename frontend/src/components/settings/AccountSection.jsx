import { useNavigate } from 'react-router-dom';
import Button from '../shared/Button';
import Card from '../shared/Card';
import * as api from '../../lib/api';

/* The account's email or phone, and signing out. */
export default function AccountSection({ user }) {
  const navigate = useNavigate();

  // The server deletes the session, so the old cookie stops working everywhere.
  const handleSignOut = async () => {
    await api.logout();
    navigate('/');
  };

  return (
    <Card>
      <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">Account</h2>

      <dl className="mt-6 space-y-3 border-t border-lineSoft pt-5">
        {user.email ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[14px] text-ink2">Email</dt>
            <dd className="text-[15px] font-semibold text-ink">{user.email}</dd>
          </div>
        ) : null}

        {user.phone ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[14px] text-ink2">Mobile</dt>
            <dd className="tnum text-[15px] font-semibold text-ink">+91 {user.phone}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
        <p className="text-2xs leading-relaxed text-muted">Signing out ends this session on the server, not just in this browser.</p>
      </div>
    </Card>
  );
}
