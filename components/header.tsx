'use client';

import Link from 'next/link';
import { Search, Heart, User, Menu } from 'lucide-react';
import { navigationItems } from '@/lib/data';
import { MiniCart } from '@/components/cart/mini-cart';

export function Header() {

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="w-full">
        <div className="flex items-center justify-between px-6 lg:px-8 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900 hover:text-orange-600 transition-colors">
            Mavren
          </Link>

          <nav className="hidden lg:flex gap-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          <div className="flex gap-4 items-center text-gray-900">
            <button
              aria-label="Open search"
              className="hover:text-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded p-2"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              aria-label="Open wishlist"
              className="hover:text-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded p-2"
            >
              <Heart className="w-5 h-5" />
            </button>

            <MiniCart />

            <button
              aria-label="Open account"
              className="hover:text-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded p-2"
            >
              <User className="w-5 h-5" />
            </button>

            <button
              aria-label="Open menu"
              className="lg:hidden hover:text-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
