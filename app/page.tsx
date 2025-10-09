'use client';

import { useEffect, useState } from 'react';
import { HeroNew } from '@/components/hero-new';
import { PromotionalBanner } from '@/components/promotional-banner';
import { EnhancedProductsGrid } from '@/components/enhanced-products-grid';
import { PremiumCollection } from '@/components/premium-collection';
import { TestimonialsSection } from '@/components/testimonials-section';
import { TrustSection } from '@/components/trust-section';
import { Footer } from '@/components/footer';
import { supabase } from '@/lib/supabase';

interface Banner {
  id: string;
  title: string;
  message: string;
  cta_text: string | null;
  cta_url: string | null;
  discount_percentage: number | null;
  expires_at: string | null;
}

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    async function loadBanners() {
      const { data } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (data) {
        setBanners(data);
      }
    }

    loadBanners();
  }, []);

  return (
    <main className="w-full">
      {banners.map((banner) => (
        <PromotionalBanner
          key={banner.id}
          title={banner.title}
          message={banner.message}
          ctaText={banner.cta_text || undefined}
          ctaUrl={banner.cta_url || undefined}
          discountPercentage={banner.discount_percentage || undefined}
          expiresAt={banner.expires_at || undefined}
        />
      ))}

      <HeroNew />

      <EnhancedProductsGrid />

      <PremiumCollection />

      <TestimonialsSection />

      <TrustSection />

      <Footer />
    </main>
  );
}
