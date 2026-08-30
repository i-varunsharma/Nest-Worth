import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import DebtsPage from './pages/DebtsPage';
import GoalsPage from './pages/GoalsPage';
import NetWorthPage from './pages/NetWorthPage';
import CheckInPage from './pages/CheckInPage';
import SettingsPage from './pages/SettingsPage';
import RequireAuth from './components/auth/RequireAuth';

/*
  App
  ---
  This file decides which page to show for which address in the browser bar.

  Open to anybody:
    /             the landing page
    /login        sign in
    /signup       create an account

  Only when signed in:
    /onboarding   the questions everything else is built from
    /dashboard    the overview
    /debts        every debt, with payoff dates and the extra-payment slider
    /goals        what you are saving for, and what each costs per month
    /net-worth    what you own against what you owe
    /check-in     what actually happened this month
    /settings     your name, household and account

  Anything else falls through to the landing page, so a bad link is never a
  dead end.

  The journey through them is:

    signup  ->  onboarding  ->  dashboard
    login   ->  dashboard

  Somebody signing up has not answered the questions yet, so they go through
  onboarding first. Somebody signing in already has, so they go straight to
  their plan.

  Every private page is wrapped in RequireAuth, which asks the server who is
  signed in and sends anybody else to the login page. That wrapper decides what
  to SHOW. What actually protects the data is the same check on the server,
  which refuses to answer without a valid session cookie.
*/

/*
  A small helper so the private routes below stay readable.

  Without it every one of those seven lines would carry the same wrapper and the
  same arrow function, and the shape of the list would be lost in the noise.
*/
function privateRoute(Page) {
  return <RequireAuth>{(user) => <Page user={user} />}</RequireAuth>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/onboarding" element={privateRoute(OnboardingPage)} />
        <Route path="/dashboard" element={privateRoute(DashboardPage)} />
        <Route path="/debts" element={privateRoute(DebtsPage)} />
        <Route path="/goals" element={privateRoute(GoalsPage)} />
        <Route path="/net-worth" element={privateRoute(NetWorthPage)} />
        <Route path="/check-in" element={privateRoute(CheckInPage)} />
        <Route path="/settings" element={privateRoute(SettingsPage)} />

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
