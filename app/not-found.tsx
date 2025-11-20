import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-9xl font-black text-brand-cream mb-4 font-tango-sans">404</h1>
      <h2 className="text-3xl font-bold text-brand-dark-blue mb-4">Page Not Found</h2>
      <p className="text-brand-dark-blue/70 mb-8 max-w-md mx-auto">
        Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
      </p>
      
      <Button asChild className="bg-brand-primary hover:bg-brand-primary/90">
        <Link href="/" className="flex items-center gap-2">
          <Home className="w-4 h-4" />
          Return Home
        </Link>
      </Button>
    </div>
  );
}

