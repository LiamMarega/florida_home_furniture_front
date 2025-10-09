import { HeroNew } from '@/components/hero-new';
import { EnhancedProductsGrid } from '@/components/enhanced-products-grid';
import { PremiumCollection } from '@/components/premium-collection';
import { TestimonialsSection } from '@/components/testimonials-section';
import { TrustSection } from '@/components/trust-section';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <main className="w-full">
      <HeroNew />

      <EnhancedProductsGrid />

      <PremiumCollection />

      <TestimonialsSection />

      <TrustSection />

      <Footer />
    </main>
  );
}
