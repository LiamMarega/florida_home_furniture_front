import type { Metadata } from 'next';
import { BackToHome } from '@/components/ui/back-to-home';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Florida Home Furniture',
  description:
    'Read the Terms & Conditions for Florida Home Furniture. Learn about our sales, payment, and refund policies.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-screen bg-brand-cream/40">
      <section className="relative bg-brand-dark-blue text-white pt-32 pb-40 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-40 mix-blend-screen">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-pill bg-brand-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 right-0 w-96 h-96 rounded-pill bg-brand-accent/20 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-4">
          <BackToHome />
          <h1 className="mt-6 text-3xl md:text-4xl font-bold text-brand-accent">Terms &amp; Conditions</h1>
          <p className="mt-2 text-white/60 text-sm">Last updated: May 2025</p>
        </div>
      </section>

      <div className="relative z-10 -mt-24 pb-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-elevated p-8 md:p-12 space-y-8 text-brand-dark-blue/80 text-[14px] leading-7">

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">1. General Information</h2>
              <p>
                These Terms &amp; Conditions govern all purchases and interactions with Florida Home Furniture,
                operated by Alexis Abramovich, located at 4055 NW 17th Ave, Miami, FL 33142.
                By placing an order or using our website, you agree to these terms in full.
              </p>
              <p className="mt-2">
                For questions, contact us at{' '}
                <a
                  href="mailto:floridahome.fh@gmail.com"
                  className="text-brand-primary underline underline-offset-2"
                >
                  floridahome.fh@gmail.com
                </a>{' '}
                or call <strong>+1 (305) 924-0685</strong>. Customer service hours: Monday – Friday, 9 AM – 6 PM.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">2. Products &amp; Pricing</h2>
              <p>
                All product descriptions, images, and prices are provided in good faith and are subject to change
                without notice. Prices are listed in US Dollars (USD) and do not include applicable taxes or
                delivery fees unless explicitly stated at checkout.
              </p>
              <p className="mt-2">
                We reserve the right to cancel or refuse any order if a pricing error is identified, stock is
                unavailable, or we suspect fraudulent activity. In such cases, you will be notified and any
                payment collected will be fully refunded.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">3. Orders &amp; Payment</h2>
              <p>
                Orders are confirmed only after successful payment processing. We accept major credit and debit
                cards via Stripe. By submitting payment, you authorize Florida Home Furniture to charge the
                total amount shown at checkout.
              </p>
              <p className="mt-2">
                All transactions are processed securely through Stripe. Florida Home Furniture does not store
                your full card details. You are responsible for ensuring that the payment information provided
                is accurate and belongs to you.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">4. Delivery</h2>
              <p>
                Delivery timelines are estimates and may vary depending on location, product availability, and
                logistics. Florida Home Furniture is not liable for delays caused by third-party carriers,
                weather events, or circumstances beyond our control.
              </p>
              <p className="mt-2">
                It is the customer&apos;s responsibility to ensure someone is available at the delivery address
                to receive the order. Failed delivery attempts may result in additional fees.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">5. No Refund Policy</h2>
              <p>
                <strong>All sales are final.</strong> Florida Home Furniture does not offer refunds or returns
                once an order has been confirmed and processed. Please review your order carefully before
                completing your purchase.
              </p>
              <p className="mt-2">
                If you receive a product that is damaged upon arrival, you must notify us within 48 hours of
                delivery by contacting our customer service team with photographic evidence. We will evaluate
                each case individually and, at our sole discretion, may offer a replacement or store credit.
                This does not constitute a general refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">6. Chargebacks &amp; Disputes</h2>
              <p>
                By placing an order, you agree to contact us directly to resolve any issue before initiating
                a chargeback with your bank or card issuer. Unauthorized chargebacks for valid, fulfilled
                orders will be disputed and may result in the suspension of your account and any future
                purchases.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">7. Limitation of Liability</h2>
              <p>
                Florida Home Furniture is not liable for any indirect, incidental, or consequential damages
                arising from the use of our products or website. Our maximum liability is limited to the
                amount paid for the specific order in question.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">8. Privacy</h2>
              <p>
                We collect and process personal information solely for the purpose of fulfilling orders and
                improving our service. We do not sell your data to third parties. Payment data is handled
                entirely by Stripe in compliance with PCI DSS standards.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">9. Changes to These Terms</h2>
              <p>
                We reserve the right to update these Terms &amp; Conditions at any time. Changes will be
                published on this page with the updated date. Continued use of the website after any changes
                constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">10. Governing Law</h2>
              <p>
                These terms are governed by the laws of the State of Florida, United States. Any disputes
                arising from these terms or your use of the website shall be subject to the exclusive
                jurisdiction of the courts of Miami-Dade County, Florida.
              </p>
            </section>

            <div className="pt-4 border-t border-brand-cream text-[12px] text-brand-dark-blue/50">
              Florida Home Furniture · 4055 NW 17th Ave, Miami, FL 33142 · +1 (305) 924-0685 ·{' '}
              <a href="mailto:floridahome.fh@gmail.com" className="underline underline-offset-2">
                floridahome.fh@gmail.com
              </a>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
