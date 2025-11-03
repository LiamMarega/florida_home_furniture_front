'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, User, Menu } from 'lucide-react';
import { navigationItems } from '@/lib/data';
import { MiniCart } from '@/components/cart/mini-cart';
import { useAuth } from '@/contexts/auth-context';

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { isAuthenticated, openAuthModal, loading: authLoading } = useAuth();
  
  // Detectar si estamos en páginas de productos o páginas internas
  const isProductPage = pathname?.startsWith('/product/') && pathname !== '/product';
  const isInternalPage = pathname !== '/' || scrolled;
  const shouldBeFixed = isProductPage || isInternalPage;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`left-0 right-0 z-50 transition-all duration-300 ${
        shouldBeFixed
          ? 'fixed top-0 bg-brand-dark-blue/95 backdrop-blur-md shadow-lg'
          : 'absolute top-0 pt-10'
      }`}
    >
      <div className="w-full">
        <div className="flex items-center justify-between px-6 lg:px-8 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logos/logo_compacto.png"
              alt="Florida Homes Furniture"
              width={120}
              height={120}
            />
          </Link>

          <nav className="hidden lg:flex gap-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-white hover:text-brand-accent transition-colors relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-accent group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          <div className="flex gap-4 items-center text-white">
            <button
              aria-label="Open search"
              className="hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
            >
              <Search className="w-5 h-5 text-white" />
            </button>

            <button
              aria-label="Open wishlist"
              className="hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
            >
              <Heart className="w-5 h-5 text-white" />
            </button>

            <MiniCart className="text-white" />

            <button
              aria-label="Open account"
              className="hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
              onClick={() => {
                if (!authLoading) {
                  if (isAuthenticated) {
                    router.push('/profile');
                  } else {
                    openAuthModal('login');
                  }
                }
              }}
              disabled={authLoading}
            >
              <User className="w-5 h-5 text-white" />
            </button>

            <button
              aria-label="Open menu"
              className="lg:hidden hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
