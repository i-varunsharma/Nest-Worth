import SimplePage from '../components/layout/SimplePage';
import Button from '../components/shared/Button';

// Shown for any address the app does not know, instead of quietly showing the
// landing page as if the link had worked.
export default function NotFoundPage() {
  return (
    <SimplePage title="This page does not exist.">
      <p>The link may be old, or there may be a typo in the address.</p>

      <div className="flex flex-wrap gap-3 pt-4">
        <Button to="/" variant="accent" arrow>Go to the home page</Button>
        <Button to="/dashboard" variant="outline">Open your dashboard</Button>
      </div>
    </SimplePage>
  );
}
