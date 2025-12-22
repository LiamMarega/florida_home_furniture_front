'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function ConditionalBack() {
  const pathname = usePathname();

  // Don't show on the main page or special pages like coming-soon
  if (pathname === '/' || pathname === '/coming-soon') {
    return null;
  }

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm relative z-40 border-b border-brand-cream/20 mt-[72px] lg:mt-[88px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="py-4"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold text-brand-dark-blue/60 hover:text-brand-primary transition-all group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-cream bg-white group-hover:bg-brand-primary group-hover:border-brand-primary transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-brand-primary/20">
              <ArrowLeft className="w-4 h-4 group-hover:text-white group-hover:-translate-x-0.5 transition-all duration-300" />
            </div>
            <span className="relative">
              Back to Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary group-hover:w-full transition-all duration-300 ease-in-out"></span>
            </span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
