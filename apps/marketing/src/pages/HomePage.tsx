import { HeroSection } from '@/components/sections/HeroSection';
import { BenefitsSection } from '@/components/sections/BenefitsSection';
import { HowItWorksSection } from '@/components/sections/HowItWorksSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { FaqSection } from '@/components/sections/FaqSection';
import { ContactSection } from '@/components/sections/ContactSection';

export function HomePage() {
  return (
    <div>
      <HeroSection prefix="marketing.home" secondaryTo="#features" />
      <BenefitsSection
        id="features"
        prefix="marketing.features"
        keys={['structure', 'portals', 'i18n', 'assessment']}
      />
      <HowItWorksSection id="for-schools" prefix="marketing.forSchools" />
      <TestimonialsSection prefix="marketing.home" />
      <PricingSection />
      <FaqSection
        prefix="marketing.home"
        keys={['pricing', 'curriculum', 'bilingual', 'hosting', 'demo']}
      />
      <ContactSection />
    </div>
  );
}
