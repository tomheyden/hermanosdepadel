import { useReveal } from '../hooks/useReveal';
import SiteNav from '../components/SiteNav';
import Hero from '../components/onepager/Hero';
import BasicsSection from '../components/onepager/BasicsSection';
import LocationSection from '../components/onepager/LocationSection';
import AmericanoSection from '../components/onepager/AmericanoSection';
import FormatSection from '../components/onepager/FormatSection';
import Footer from '../components/onepager/Footer';

export default function OnePager() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className="relative">
      <SiteNav overHero />
      <main>
        <Hero />
        <BasicsSection />
        <LocationSection />
        <AmericanoSection />
        <FormatSection />
      </main>
      <Footer />
    </div>
  );
}
