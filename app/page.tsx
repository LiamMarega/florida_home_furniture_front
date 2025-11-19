import { HeroNew } from '@/components/hero-new';
import { ProductsGrid } from '@/components/products-grid';
import { PremiumCollection } from '@/components/premium-collection';
import { TestimonialsSection } from '@/components/testimonials-section';
import { TrustSection } from '@/components/trust-section';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <main className="w-full">
      <HeroNew />

      <PremiumCollection />

      <ProductsGrid />

      {/* <TestimonialsSection /> */}

      <TrustSection />

    </main>
  );
}
