'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Star, ShoppingCart } from 'lucide-react';
import { vendureClient } from '@/lib/vendure-client';
import { GET_ALL_PRODUCTS } from '@/lib/graphql/queries';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import Image from 'next/image';

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
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DisplayProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high'>('featured');
  const { ref, isVisible } = useScrollAnimation();

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await vendureClient.request<{ products: { items: DisplayProduct[] } }>(
          GET_ALL_PRODUCTS
        );

        if (data.products.items) {
          setProducts(data.products.items);
          setFilteredProducts(data.products.items);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Since we don't have price data, we'll just sort by name for now
    switch (sortBy) {
      case 'price-low':
      case 'price-high':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Keep original order for 'featured'
        break;
    }

    setFilteredProducts(filtered);
  }, [searchQuery, sortBy, products]);


  return (
    <section id="products-section" ref={ref} className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
            Explore latest collection
          </h2>
          <p className="text-lg text-brand-dark-blue/80 mb-8">
            Modern furniture that blends with your personal style
          </p>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark-blue/60" />
              <Input
                type="text"
                placeholder="Search furniture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base border-brand-cream focus:border-brand-primary focus:ring-brand-primary"
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

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-brand-dark-blue/60 text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-brand transition-all duration-300"
              >
                <div className="relative aspect-square overflow-hidden bg-brand-cream">
                  <Image
                    src={product.featuredAsset.preview}
                    alt={product.name}
                    fill
                    className="object-cover" 
                    />
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
                      onClick={() => window.open(`/products/${product.slug}`, '_blank')}
                      className="gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
