import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ContactHero } from '@/components/contact/contact-hero';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Florida Home Furniture. Our Miami team will help you furnish your space with curated, premium pieces.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <main id="main-content" className="relative min-h-screen bg-brand-cream/40">
      <section className="relative bg-brand-dark-blue text-white pt-32 pb-40 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-40 mix-blend-screen">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-pill bg-brand-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 right-0 w-96 h-96 rounded-pill bg-brand-accent/20 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-sm font-semibold text-brand-accent hover:text-white transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-pill border border-brand-accent/40 bg-white/5 group-hover:bg-brand-accent group-hover:border-brand-accent transition-colors">
              <ArrowLeft className="w-4 h-4 text-brand-accent group-hover:text-brand-dark-blue group-hover:-translate-x-0.5 transition-all duration-300" />
            </span>
            <span className="relative">
              Back to Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-accent group-hover:w-full transition-all duration-300"></span>
            </span>
          </Link>
        </div>
      </section>

      <div className="relative -mt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-start">
            <div className="bg-brand-dark-blue rounded-xl p-8 md:p-10 shadow-elevated min-h-[520px] relative overflow-hidden">
              <ContactHero />
            </div>
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  );
}
