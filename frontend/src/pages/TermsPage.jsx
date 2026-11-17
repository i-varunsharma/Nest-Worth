import { Link } from 'react-router-dom';
import SimplePage from '../components/layout/SimplePage';

const headingClasses = 'pt-4 font-display text-[24px] leading-snug text-ink';

// /terms: the short rules for using Nestworth. Linked from the signup form.
export default function TermsPage() {
  return (
    <SimplePage title="Terms of use" updated="Last updated 17 November 2026">
      <p>
        By creating an account you agree to these terms. They are short on purpose.
      </p>

      <h2 className={headingClasses}>Guidance, not advice</h2>
      <p>
        Nestworth gives educational guidance. It is not regulated investment advice, and
        Nestworth is not registered with SEBI as an investment adviser. The plan is worked
        out from the numbers you enter and from general rules, such as an assumed 11% long-run
        market return. Real returns, prices and tax will differ. Decisions about your money
        are yours, so check anything important with a qualified adviser.
      </p>

      <h2 className={headingClasses}>A project in beta</h2>
      <p>
        Nestworth is free while in beta. Features may change or be removed, and the service
        may be unavailable at times. Keep your own record of anything you cannot afford to lose.
      </p>

      <h2 className={headingClasses}>Your account</h2>
      <p>
        Enter numbers that are yours to share, keep your password to yourself, and do not try
        to break, overload or get into parts of the service that are not yours. Accounts used
        that way may be closed.
      </p>

      <h2 className={headingClasses}>Your data</h2>
      <p>
        What we store and who sees it is set out on the{' '}
        <Link to="/privacy" className="sweep font-medium text-ink">privacy page</Link>. You can
        delete your account and everything in it at any time from Settings.
      </p>
    </SimplePage>
  );
}
