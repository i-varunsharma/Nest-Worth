import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

/*
  App
  ---
  This file decides which page to show for which address in the browser bar.

    /         -> the landing page
    /login    -> the sign in form
    /signup   -> the create account form
    anything else -> the landing page, so a bad link is never a dead end

  BrowserRouter switches pages without reloading the browser, which is what
  makes the site feel instant when you click between these three.
*/
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
