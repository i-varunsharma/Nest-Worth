import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import HouseholdFlow from '../components/landing/HouseholdFlow';
import HowItWorks from '../components/landing/HowItWorks';
import CompareStrip from '../components/landing/CompareStrip';
import ValueGrid from '../components/landing/ValueGrid';
import Projection from '../components/landing/Projection';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';

/**
 * One household is shared by every section: change the slider in the hero and
 * the problem statement and the projection re-read from the same plan. The page
 * behaves like the product rather than describing it.
 */
export default function LandingPage() {
  const [household, setHousehold] = useState({ income: 62000, dependents: 2, hasLoan: true });

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <Hero state={household} onChange={setHousehold} />
        <HouseholdFlow state={household} />
        <HowItWorks />
        <CompareStrip />
        <ValueGrid />
        <Projection state={household} />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
