'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, User, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniCart } from '@/components/cart/mini-cart';
import { useAuth } from '@/contexts/auth-context';
import { useSearch } from '@/contexts/search-context';
import { MobileMenuDrawer } from '@/components/header/mobile-menu-drawer';
import { Input } from '@/components/ui/input';

interface Category {
  name: string;
  href: string;
  productCount?: number;
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const { isAuthenticated, openAuthModal, loading: authLoading } = useAuth();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/products/get-categories');
        if (response.ok) {
          const data = await response.json();
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories.reverse());
          }
        } else {
          console.warn('Failed to fetch categories, using default navigation items');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Keep default navigationItems on error
      }
    };

    fetchCategories();
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Scroll to products section
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      const offset = -150; // Account for header
      const elementPosition = productsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    // Don't clear search - keep it active so products remain filtered
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Scroll to products section
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      const offset = 100;
      const elementPosition = productsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    } else if (pathname !== '/') {
      // Navigate to homepage if products section doesn't exist
      router.push('/');
      setTimeout(() => {
        const productsSection = document.getElementById('products-section');
        if (productsSection) {
          const offset = 100;
          const elementPosition = productsSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // Force header to be fixed when search is open on mobile
  const shouldBeFixedWithSearch = shouldBeFixed || (isSearchOpen && isMobile);

  return (
    <header
      className={`left-0 right-0 z-50 transition-all duration-300 ${
        shouldBeFixedWithSearch
          ? 'fixed top-0 bg-brand-dark-blue/95 backdrop-blur-md shadow-lg'
          : 'absolute top-0 pt-10'
      }`}
    >
      <div className="w-full">
        <div className="flex items-center justify-between px-6 lg:px-8 py-4 max-w-7xl mx-auto gap-4 lg:gap-0">
          {/* Logo - Hide on mobile when search is open */}
          <AnimatePresence>
            {(!isSearchOpen || !isMobile) && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <Link href="/" className="flex items-center">
                  <Image
                    src="/images/logos/logo_compacto.png"
                    alt="Florida Home Furniture"
                    width={120}
                    height={120}
                  />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="hidden lg:flex gap-8">
            {categories.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-white hover:text-brand-accent transition-colors relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-accent group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}

            {categories.length > 0 && (
               <button
               className="hidden lg:block text-sm font-medium text-white hover:text-brand-accent transition-colors"
               onClick={() => setIsMobileMenuOpen(true)}
               aria-label="View all categories"
             >
               More
             </button>
            )}

        
          </nav>

          <div className="flex gap-3 lg:gap-4 items-center text-white flex-shrink-0 ml-auto lg:ml-0 lg:flex-initial">
            {/* Search Input - Desktop */}
            <AnimatePresence mode="wait">
              {isSearchOpen ? (
                <motion.form
                  key="search-form"
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  onSubmit={handleSearchSubmit}
                  className="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[300px]"
                >
                  <Search className="w-5 h-5 text-white flex-shrink-0" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search furniture..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="bg-transparent border-0 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto px-0 py-0"
                  />
                  <button
                    type="button"
                    onClick={handleSearchClose}
                    aria-label="Close search"
                    className="hover:text-brand-accent transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  key="search-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  aria-label="Open search"
                  onClick={handleSearchClick}
                  className="hidden lg:block hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
                >
                  <Search className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Mobile Search Input - Inside Header */}
            <AnimatePresence>
              {isSearchOpen && (
                <motion.form
                  key="mobile-search-form"
                  initial={{ opacity: 0, scale: 0.95, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: '100%' }}
                  exit={{ opacity: 0, scale: 0.95, width: 0 }}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  onSubmit={handleSearchSubmit}
                  className="lg:hidden flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 flex-1 max-w-full"
                >
                  <Search className="w-5 h-5 text-white flex-shrink-0" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search furniture..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="bg-transparent border-0 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto px-0 py-0 text-base flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleSearchClose}
                    aria-label="Close search"
                    className="hover:text-brand-accent transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Search Button - Mobile (opens search) */}
            <AnimatePresence>
              {!isSearchOpen && (
                <motion.button
                  key="mobile-search-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  aria-label="Open search"
                  onClick={handleSearchClick}
                  className="lg:hidden hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
                >
                  <Search className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Other Icons - Hide on mobile when search is open */}
            <AnimatePresence>
              {(!isSearchOpen || !isMobile) && (
                <>
                  <motion.div
                    key="minicart"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="lg:hidden"
                  >
                    <MiniCart className="text-white" />
                  </motion.div>

                  <motion.button
                    key="user-button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Open account"
                    className="lg:hidden hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
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
                  </motion.button>

                  <motion.button
                    key="menu-button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Open menu"
                    className="lg:hidden hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 rounded p-2"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    <Menu className="w-6 h-6 text-white" />
                  </motion.button>
                </>
              )}
            </AnimatePresence>

            {/* Desktop Icons - Always visible */}
            <div className="hidden lg:flex gap-4 items-center">
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
            </div>
          </div>
        </div>
      </div>
      
      <MobileMenuDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
    </header>
  );
}
