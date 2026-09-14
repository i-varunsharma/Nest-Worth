import AppShell from './AppShell';
import { SkeletonPage } from '../shared/Skeleton';

/*
  The two states every signed-in page shows before its content: still loading,
  and failed to load. Both keep the page frame, so only the missing part looks
  missing.
*/

export function PageLoading({ user, title, label, stats, cards }) {
  return (
    <AppShell user={user} title={title}>
      <SkeletonPage label={label} stats={stats} cards={cards} />
    </AppShell>
  );
}

export function PageError({ user, title, message }) {
  return (
    <AppShell user={user} title={title}>
      <p role="alert" className="text-[14.5px] text-clay">{message}</p>
    </AppShell>
  );
}
