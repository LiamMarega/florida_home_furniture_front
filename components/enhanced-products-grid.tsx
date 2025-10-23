'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Star, ShoppingCart } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { GET_ALL_PRODUCTS } from '@/lib/graphql/queries';
import { fetchGraphQL } from '@/lib/vendure-server';

interface DisplayProduct {
  id: string;
  name: string;
  slug: string;
  featuredAsset: {
    id: string;
    preview: string;
  };
}

export function EnhancedProductsGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high'>('featured');
  const { ref, isVisible } = useScrollAnimation();
  
  // Use React Query to fetch products
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => fetchGraphQL({ query: GET_ALL_PRODUCTS }),
  });

  // Memoize filtered and sorted products
  const filteredProducts = useMemo(() => {
    let filtered = productsResponse?.data?.products?.items || [];
    return filtered;
  }, [productsResponse, searchQuery, sortBy as any]);
  
  // Fallback: ensure products are visible after a delay if intersection observer fails
  useEffect(() => {
    if (!isLoading && !isVisible) {
      const fallbackTimer = setTimeout(() => {
        // Force visibility after 2 seconds if intersection observer hasn't triggered
        const element = ref.current;
        if (element && !isVisible) {
          // Trigger a re-render by updating a dummy state
          setSearchQuery(prev => prev);
        }
      }, 2000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [isLoading, isVisible, ref]);



  return (
    <section id="products-section" ref={ref} className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
            Explore latest collection
          </h2>
          <p className="text-lg text-brand-dark-blue/80 mb-8">
            Quality furniture that fits your budget and style
          </p>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark-blue/60" />
              <Input
                type="text"
                placeholder="Search furniture..."
                className="pl-12 h-12 text-base border-brand-cream focus:border-brand-primary focus:ring-brand-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-brand-cream rounded-lg bg-white text-brand-dark-blue font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>

              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Filters
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-brand-dark-blue/60 text-lg">Loading products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 text-lg mb-4">Failed to load products</p>
            <p className="text-brand-dark-blue/60">{error.message}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-brand-dark-blue/60 text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredProducts.map((product: DisplayProduct) => (
              <motion.div
                key={product.id}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-brand transition-all duration-300"
              >
                <Link 
                  href={`/products/${product.slug}`}
                  className="block"
                  prefetch={true}
                >
                <div className="relative aspect-square overflow-hidden bg-brand-cream">
                  {product.featuredAsset?.preview ? (
                  <Image
                    src={product.featuredAsset?.preview}
                    alt={product.name}
                    fill
                    className="object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-brand-cream rounded-md flex items-center justify-center">
                       <Image
                    src={'/images/logos/ISO.png'}
                    alt={product.name}
                    width={60}
                    height={60}
                    className="object-cover opacity-50" 
                    />
                    </div>
                  )}
                </div>

                  <div className="p-6">
                    <h3 className="font-bold text-brand-dark-blue text-lg mb-2 line-clamp-1 font-tango-sans">
                      {product.name}
                    </h3>

                    <p className="text-sm text-brand-dark-blue/70 mb-4 line-clamp-2">
                      Available now - Click to view more details
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-lg font-semibold text-brand-dark-blue">
                          View details
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={(e) => e.preventDefault()}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
