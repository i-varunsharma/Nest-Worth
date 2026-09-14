import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
import RequireAuth from './components/auth/RequireAuth';

/*
  Decides which page to show for which address in the browser bar.

  Open to anybody:
    /                 the landing page
    /login            sign in
    /signup           create an account
    /forgot-password  ask for a password reset link
    /reset-password   choose a new password, using the token in that link

  The two password pages are open to anybody, because somebody who cannot sign
  in is exactly who needs them. What protects /reset-password is the one-time
  token in its address, which only the account's own inbox receives.

  Only when signed in:
    /onboarding   the questions everything else is built from
    /dashboard    the overview
    /family       the people this salary supports, by name
    /plans        the same money spent several ways, and where each one lands
    /stress-test  what a job loss, pay cut or hospital bill does to the cash
    /debts        every debt, with payoff dates and the extra-payment slider
    /goals        what you are saving for, and what each costs per month
    /net-worth    what you own against what you owe
    /spending     a bank statement, read and sorted into categories
    /recap        a whole year of those, added up and looked back on
    /check-in     what actually happened this month
    /settings     your name, household and account

  Anything else falls through to the landing page, so a bad link is never a
  dead end.

  The journey is:

    signup  ->  onboarding  ->  dashboard
    login   ->  dashboard

  Somebody signing up has not answered the questions yet. Somebody signing in
  has, so they go straight to their plan.

  Every private page is wrapped in RequireAuth, which asks the server who is
  signed in. That decides what to show; what protects the data is the same
  check on the server.
*/

// Keeps the private routes below readable. Without it, each of those seven
// lines carries the same wrapper and the same arrow function.
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
