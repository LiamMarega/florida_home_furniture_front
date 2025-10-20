'use client';

import { useState } from 'react';
import { Twitter, Instagram, Hash } from 'lucide-react';
import { Button } from './ui/button';

export function Footer() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Newsletter signup:', email);
    setEmail('');
  };

  return (
    <footer className="mt-12 bg-white rounded-lg p-6 md:p-8 shadow-soft relative overflow-hidden">
      <div
        className="pointer-events-none absolute -bottom-4 left-6 text-[96px] md:text-[140px] font-black tracking-tight select-none"
        style={{ color: 'rgba(35, 68, 101, 0.05)' }}
      >
        FLORIDA HOMES
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="text-[14px] font-semibold text-brand-dark-blue mb-3">Location:</h3>
          <p className="text-[12px] text-brand-dark-blue/70 leading-6">
            Florida Homes Furniture<br />
            Design District, Suite 201<br />
            Miami, Florida 33127
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-brand-dark-blue mb-3">Contact Us:</h3>
          <p className="text-[12px] text-brand-dark-blue/70 leading-6">
            Phone: +1 (305) 555-0123<br />
            Customer Service Hours:<br />
            Mon - Fri 9 AM - 6 PM
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-brand-dark-blue mb-3">Email:</h3>
          <p className="text-[12px] text-brand-dark-blue/70 leading-6">
            For inquiries:<br />
            info@floridahomesfurniture.com<br />
            For support:<br />
            support@floridahomesfurniture.com
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-brand-dark-blue mb-3">Sign up for our newsletter</h3>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="h-10 flex-1 rounded-lg border border-brand-cream px-4 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              required
            />
            <Button type="submit" size="sm">Enter</Button>
          </form>
        </div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between pt-6 border-t border-brand-cream gap-4">
        <div className="flex gap-4">
          <button
            aria-label="Twitter"
            className="text-brand-dark-blue/70 hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded"
          >
            <Twitter className="w-5 h-5" />
          </button>
          <button
            aria-label="Instagram"
            className="text-brand-dark-blue/70 hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded"
          >
            <Instagram className="w-5 h-5" />
          </button>
          <button
            aria-label="Pinterest"
            className="text-brand-dark-blue/70 hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded"
          >
            <Hash className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[12px] text-brand-dark-blue/70">
          <a
            href="/terms"
            className="hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded"
          >
            Terms & Conditions
          </a>
        </p>
      </div>
    </footer>
  );
}
