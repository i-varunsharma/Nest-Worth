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

/*
  LandingPage
  -----------
  The home page. It does two jobs.

  1. It lists the sections in the order the reader meets them.

  2. It owns the household numbers. Three sections need them: the planner card in
     the hero, the "where the money goes" section, and the projection chart. If
     each of those kept its own copy they would drift apart, so instead this page
     holds the single copy and hands it down. Move the slider in the hero and the
     sections further down change with it.

     React people call this "lifting state up": whichever component sits above
     everyone who needs the data is the one that should hold it.
*/
export default function LandingPage() {
  // The household we start with: a fairly typical first job with two people to
  // support and an education loan still running.
  const [household, setHousehold] = useState({
    income: 62000,
    dependents: 2,
    hasLoan: true,
  });

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main>
        {/* Only the hero can edit the household, so only it gets onHouseholdChange. */}
        <Hero household={household} onHouseholdChange={setHousehold} />

        {/* These two read the household but never change it. */}
        <HouseholdFlow household={household} />

        <HowItWorks />
        <CompareStrip />
        <ValueGrid />

        <Projection household={household} />

        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
