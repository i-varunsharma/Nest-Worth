import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import CompareStrip from '../components/landing/CompareStrip';
import ValueGrid from '../components/landing/ValueGrid';
import Projection from '../components/landing/Projection';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';

// The landing page. It holds the demo household, because both the hero planner
// and the projection chart need the same numbers ("lifting state up").
export default function LandingPage() {
  // The household we start with: a fairly typical first job with two people to
  // support and an education loan still running.
  const [household, setHousehold] = useState({
    income: 62000,
    dependents: 2,
    hasLoan: true,
    incomeVaries: false,
    essentialCosts: 22000,
  });

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main>
        {/* Only the hero can edit the household, so only it gets onHouseholdChange. */}
        <Hero household={household} onHouseholdChange={setHousehold} />

        <HowItWorks />
        <CompareStrip />
        <ValueGrid />

        {/* Reads the household but never changes it. */}
        <Projection household={household} />

        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
