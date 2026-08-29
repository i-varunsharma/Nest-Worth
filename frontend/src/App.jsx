import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';

/*
  App
  ---
  This file decides which page to show for which address in the browser bar.

    /             the landing page, for people who have not signed up
    /login        the sign in form
    /signup       the create account form
    /onboarding   the three questions, shown straight after signing up
    /dashboard    the finished plan, where signing in lands you
    anything else the landing page, so a bad link is never a dead end

  The journey through them is:

    signup  ->  onboarding  ->  dashboard
    login   ->  dashboard

  Someone signing up has not answered the questions yet, so they go through
  onboarding first. Someone signing in has already answered them, so they go
  straight to their plan.

  BrowserRouter switches pages without reloading the browser, which is what makes
  moving between them feel instant.
*/
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
