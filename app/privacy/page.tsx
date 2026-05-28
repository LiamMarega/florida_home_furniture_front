import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Florida Home Furniture',
  description:
    'Learn how Florida Home Furniture collects, uses, and protects your personal information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="relative min-h-screen bg-brand-cream/40">
      <section className="relative bg-brand-dark-blue text-white pt-32 pb-40 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-40 mix-blend-screen">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-pill bg-brand-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 right-0 w-96 h-96 rounded-pill bg-brand-accent/20 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-accent">Privacy Policy</h1>
          <p className="mt-2 text-white/60 text-sm">Last updated: May 2025</p>
        </div>
      </section>

      <div className="relative -mt-24 pb-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-elevated p-8 md:p-12 space-y-8 text-brand-dark-blue/80 text-[14px] leading-7">

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">1. Information We Collect</h2>
              <p>We collect only what is necessary to process your order and provide customer support:</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-brand-dark-blue/70">
                <li>Name and contact details (email, phone number)</li>
                <li>Shipping and billing address</li>
                <li>Order details and purchase history</li>
                <li>Communications you send us (email, contact form, SMS)</li>
                <li>Newsletter subscription email (only if you opt in)</li>
              </ul>
              <p className="mt-3">
                We do <strong>not</strong> collect or store payment card data. All payment processing is handled
                securely by <strong>Stripe</strong>, which is PCI DSS Level 1 certified.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">2. How We Use Your Information</h2>
              <p>Your information is used strictly to:</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-brand-dark-blue/70">
                <li>Process and fulfill your orders</li>
                <li>Send order confirmations and delivery updates</li>
                <li>Respond to your inquiries and customer service requests</li>
                <li>Send newsletter emails (only if you subscribed)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">3. Third-Party Services</h2>
              <p>
                We use trusted third-party services to operate our business. These providers process data
                only as necessary to deliver their services:
              </p>
              <ul className="mt-3 list-disc list-inside space-y-2 text-brand-dark-blue/70">
                <li>
                  <strong>Payment processor</strong> — all card transactions are handled by a PCI DSS
                  Level 1 certified provider. We never see or store your full card number.
                </li>
                <li>
                  <strong>Hosting &amp; infrastructure</strong> — our website is served through a
                  cloud infrastructure provider. Server logs (IP address, browser type, pages visited,
                  timestamps) may be collected automatically for security and performance purposes.
                  This data is not used for advertising and is retained for a limited period.
                  Your data may be processed on servers located in the United States.
                </li>
              </ul>
              <p className="mt-3">
                We do <strong>not</strong> sell, rent, or share your personal data with any third party
                for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">4. Cookies</h2>
              <p>
                Our website may use essential cookies required for the site to function correctly (e.g.,
                session and cart management). We do not use tracking or advertising cookies.
              </p>
              <p className="mt-2">
                You can disable cookies in your browser settings, but this may affect the functionality
                of the site.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">5. Data Retention</h2>
              <p>
                We retain your personal data only for as long as necessary to fulfill the purposes described
                in this policy, or as required by law. Order records may be retained for up to 5 years
                for accounting and legal compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-brand-dark-blue/70">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Opt out of newsletter communications at any time via the unsubscribe link</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at{' '}
                <a
                  href="mailto:floridahome.fh@gmail.com"
                  className="text-brand-primary underline underline-offset-2"
                >
                  floridahome.fh@gmail.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">7. Security</h2>
              <p>
                We implement reasonable technical and organizational measures to protect your personal
                information. Payment data is encrypted end-to-end and handled exclusively by Stripe.
                Despite our efforts, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-brand-dark-blue mb-3">8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be published on this
                page with an updated date. Continued use of the website after changes constitutes
                acceptance of the updated policy.
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
