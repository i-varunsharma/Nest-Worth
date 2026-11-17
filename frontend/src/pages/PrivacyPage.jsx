import { Link } from 'react-router-dom';
import SimplePage from '../components/layout/SimplePage';

// Shared look for the small headings on this page and the terms page.
const headingClasses = 'pt-4 font-display text-[24px] leading-snug text-ink';

/*
  /privacy: what Nestworth stores and who else sees it, in plain words.
  If the app starts sending data somewhere new (an email or SMS provider,
  analytics), this page has to be updated in the same change.
*/
export default function PrivacyPage() {
  return (
    <SimplePage title="What we do with your data" updated="Last updated 17 November 2026">
      <p>
        Nestworth is a student project in beta. It asks about money and family, which is
        personal, so this page says exactly what happens to what you type.
      </p>

      <h2 className={headingClasses}>What we store</h2>
      <p>
        Your name, your email or mobile number, and your password, which is stored only as a
        one-way hash so nobody can read it back. Then the numbers you enter: income, living
        costs, the people you support, debts, goals, assets, monthly check-ins, and the
        transactions from any bank statement you choose to import.
      </p>
      <p>
        We never ask for a bank login, and we never connect to your bank.
      </p>

      <h2 className={headingClasses}>Where it is kept</h2>
      <p>
        In a database on our server, which is hosted by Railway. The website itself is served
        by Vercel. Neither of them uses your data for anything except running the site.
      </p>

      <h2 className={headingClasses}>Who else sees it</h2>
      <p>
        <strong className="font-semibold text-ink">The AI coach.</strong> Only when you press
        the button, your numbers are sent to the AI provider we use (Anthropic or Google) to
        write that one answer. Nothing is sent in the background.
      </p>
      <p>
        <strong className="font-semibold text-ink">Google sign-in.</strong> If you sign in with
        Google, Google tells us your name and email address. We do not get your Google password
        or anything else from your account.
      </p>
      <p>
        Nobody else. We do not sell your data, show ads or use tracking scripts.
      </p>

      <h2 className={headingClasses}>Cookies</h2>
      <p>
        One cookie, which keeps you signed in. Your light or dark theme choice is saved in
        your own browser and never sent to us.
      </p>

      <h2 className={headingClasses}>Deleting everything</h2>
      <p>
        In Settings, "Delete my account" removes your account and every number in it straight away.
        It cannot be undone.
      </p>

      <p className="pt-4">
        See also the <Link to="/terms" className="sweep font-medium text-ink">terms of use</Link>.
      </p>
    </SimplePage>
  );
}
