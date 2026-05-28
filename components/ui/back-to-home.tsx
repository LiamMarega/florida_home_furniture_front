import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackToHome() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 text-sm font-semibold text-brand-accent hover:text-white transition-colors"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-pill border border-brand-accent/40 bg-white/5 group-hover:bg-brand-accent group-hover:border-brand-accent transition-colors">
        <ArrowLeft className="w-4 h-4 text-brand-accent group-hover:text-brand-dark-blue group-hover:-translate-x-0.5 transition-all duration-300" />
      </span>
      <span className="relative">
        Back to Home
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-accent group-hover:w-full transition-all duration-300" />
      </span>
    </Link>
  );
}
