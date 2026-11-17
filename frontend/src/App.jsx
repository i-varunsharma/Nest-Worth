import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';
import DebtsPage from './pages/DebtsPage';
import GoalsPage from './pages/GoalsPage';
import NetWorthPage from './pages/NetWorthPage';
import SpendingPage from './pages/SpendingPage';
import RecapPage from './pages/RecapPage';
import CheckInPage from './pages/CheckInPage';
import SettingsPage from './pages/SettingsPage';
import FamilyPage from './pages/FamilyPage';
import StressTestPage from './pages/StressTestPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';
import RequireAuth from './components/auth/RequireAuth';
import ErrorBoundary from './components/shared/ErrorBoundary';

/*
  Which page shows at which address.

  Open to anybody: /, /login, /signup, /forgot-password, /reset-password,
  /privacy, /terms.
  Signed in only: /onboarding, /dashboard, /family, /plans, /stress-test, /debts,
  /goals, /net-worth, /spending, /recap, /check-in, /settings.
  Anything else shows the not found page.

  RequireAuth decides what to show. The data itself is protected on the server.
*/

// The browser tab title for each address. Anything missing gets the site name.
const PAGE_TITLES = {
  '/': 'Nestworth: your net worth was never just yours',
  '/login': 'Sign in · Nestworth',
  '/signup': 'Create an account · Nestworth',
  '/forgot-password': 'Forgot password · Nestworth',
  '/reset-password': 'Choose a new password · Nestworth',
  '/privacy': 'Privacy · Nestworth',
  '/terms': 'Terms of use · Nestworth',
  '/onboarding': 'Set up your plan · Nestworth',
  '/dashboard': 'Dashboard · Nestworth',
  '/family': 'Family · Nestworth',
  '/plans': 'Plans · Nestworth',
  '/stress-test': 'Stress test · Nestworth',
  '/debts': 'Debts · Nestworth',
  '/goals': 'Goals · Nestworth',
  '/net-worth': 'Net worth · Nestworth',
  '/spending': 'Spending · Nestworth',
  '/recap': 'Your year · Nestworth',
  '/check-in': 'Monthly check-in · Nestworth',
  '/settings': 'Settings · Nestworth',
};

const NOT_FOUND_TITLE = 'Page not found · Nestworth';

/*
  Sets the tab title whenever the address changes. It draws nothing.
  useEffect runs after React has updated the page, and runs again only when
  pathname changes, because pathname is listed in the array at the end.
*/
function PageTitle() {
  const location = useLocation();

  useEffect(() => {
    let title = PAGE_TITLES[location.pathname];
    if (title === undefined) {
      title = NOT_FOUND_TITLE;
    }
    document.title = title;
  }, [location.pathname]);

  return null;
}

// Keeps the private routes below readable. Without it, each of those seven
// lines carries the same wrapper and the same arrow function.
function privateRoute(Page) {
  return <RequireAuth>{(user) => <Page user={user} />}</RequireAuth>;
}

/*
  Gives every page its own error boundary.

  The key is the address. When the key changes React throws the old boundary
  away and makes a fresh one, so a crash on one page clears as soon as somebody
  clicks to another. Without it, one broken page left "Something broke" on
  every page after it until a full reload.
*/
function PageBoundary({ children }) {
  const location = useLocation();

  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <BrowserRouter>
      <PageTitle />
      <PageBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          <Route path="/onboarding" element={privateRoute(OnboardingPage)} />
          <Route path="/dashboard" element={privateRoute(DashboardPage)} />
          <Route path="/family" element={privateRoute(FamilyPage)} />
          <Route path="/plans" element={privateRoute(PlansPage)} />
          <Route path="/stress-test" element={privateRoute(StressTestPage)} />
          <Route path="/debts" element={privateRoute(DebtsPage)} />
          <Route path="/goals" element={privateRoute(GoalsPage)} />
          <Route path="/net-worth" element={privateRoute(NetWorthPage)} />
          <Route path="/spending" element={privateRoute(SpendingPage)} />
          <Route path="/recap" element={privateRoute(RecapPage)} />
          <Route path="/check-in" element={privateRoute(CheckInPage)} />
          <Route path="/settings" element={privateRoute(SettingsPage)} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageBoundary>
    </BrowserRouter>
  );
}
