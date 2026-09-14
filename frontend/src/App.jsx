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
  Which page shows at which address.

  Open to anybody: /, /login, /signup, /forgot-password, /reset-password.
  Signed in only: /onboarding, /dashboard, /family, /plans, /stress-test, /debts,
  /goals, /net-worth, /spending, /recap, /check-in, /settings.
  Anything else shows the landing page.

  RequireAuth decides what to show. The data itself is protected on the server.
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
