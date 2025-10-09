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
        style={{ color: 'rgba(10, 10, 10, 0.05)' }}
      >
        PRABOTT
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-3">Location:</h3>
          <p className="text-[12px] text-[#4A4A4A] leading-6">
            Prabott Furniture Store 93<br />
            Harmony Street, Suite 638<br />
            Jakarta, Indonesia 12545
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-3">Contact Us:</h3>
          <p className="text-[12px] text-[#4A4A4A] leading-6">
            Phone: +62 225 195 634<br />
            Customer Service Hours:<br />
            Mon - Fri 9 AM - 6 PM
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-3">Email:</h3>
          <p className="text-[12px] text-[#4A4A4A] leading-6">
            For inquiries:<br />
            info@prabottfurniture.com<br />
            For support:<br />
            support@prabottfurniture.com
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-3">Sign up for our newsletter</h3>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="h-10 flex-1 rounded-pill border border-[#E5E7EB] px-4 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2"
              required
            />
            <Button type="submit" size="sm">Enter</Button>
          </form>
        </div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between pt-6 border-t border-[#E5E7EB] gap-4">
        <div className="flex gap-4">
          <button
            aria-label="Twitter"
            className="text-[#4A4A4A] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 rounded"
          >
            <Twitter className="w-5 h-5" />
          </button>
          <button
            aria-label="Instagram"
            className="text-[#4A4A4A] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 rounded"
          >
            <Instagram className="w-5 h-5" />
          </button>
          <button
            aria-label="Pinterest"
            className="text-[#4A4A4A] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 rounded"
          >
            <Hash className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[12px] text-[#4A4A4A]">
          <a
            href="/terms"
            className="hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 rounded"
          >
            Terms & Conditions
          </a>
        </p>
      </div>
    </footer>
  );
}
