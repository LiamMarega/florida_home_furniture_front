'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, User, Menu } from 'lucide-react';
import { navigationItems } from '@/lib/data';
import { MiniCart } from '@/components/cart/mini-cart';

export function Header() {
  // Estado para controlar si el usuario ha hecho scroll
  // const [scrolled, setScrolled] = useState(false);

  // useEffect(() => {
  //   // Función para manejar el scroll y cambiar el estado
  //   const handleScroll = () => {
  //     // Detectar cuando el scroll pasa los 40px (top-10)
  //     // Solo entonces el navbar se vuelve sticky en top-0 y se aplican los efectos
  //     if (window.scrollY >= 50) {
  //       setScrolled(true);
  //     } else {
  //       setScrolled(false);
  //     }
  //   };

  //   window.addEventListener('scroll', handleScroll);
  //   // Limpieza al desmontar
  //   return () => window.removeEventListener('scroll', handleScroll);
  // }, []);

  return (
    <header
      className={`left-0 right-0 z-50 transition-all  ${
        false
          ? 'fixed top-0 bg-brand-dark-blue backdrop-blur-md '
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
