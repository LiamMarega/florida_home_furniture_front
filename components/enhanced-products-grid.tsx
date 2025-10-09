'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Star, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { useCart } from '@/contexts/cart-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  price: number;
  sale_price: number | null;
  images: { url: string; alt: string }[];
  rating: number;
  review_count: number;
  stock_count: number;
}

export function EnhancedProductsGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const { ref, isVisible } = useScrollAnimation();
  const { addItem } = useCart();

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('featured', { ascending: false });

      if (data) {
        setProducts(data);
        setFilteredProducts(data);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    setFilteredProducts(filtered);
  }, [searchQuery, sortBy, products]);

  const handleAddToCart = async (productId: string, productName: string) => {
    await addItem(productId);
    toast.success(`${productName} added to cart!`);
  };

  return (
    <section id="products-section" ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Explore latest collection
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Furniture that blends with your personal style
          </p>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search furniture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>

            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
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
            <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredProducts.map((product) => {
              const currentPrice = product.sale_price || product.price;
              const hasDiscount = product.sale_price !== null;
              const discountPercentage = hasDiscount
                ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
                : 0;

              return (
                <motion.div
                  key={product.id}
                  variants={staggerItem}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    {hasDiscount && (
                      <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        -{discountPercentage}%
                      </div>
                    )}

                    {product.stock_count < 10 && product.stock_count > 0 && (
                      <div className="absolute top-4 right-4 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Only {product.stock_count} left!
                      </div>
                    )}

                    <img
                      src={product.images[0]?.url || 'https://via.placeholder.com/400'}
                      alt={product.images[0]?.alt || product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">({product.review_count})</span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">
                      {product.name}
                    </h3>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.short_description}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          £{currentPrice.toFixed(2)}
                        </div>
                        {hasDiscount && (
                          <div className="text-sm text-gray-500 line-through">
                            £{product.price.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product.id, product.name)}
                        disabled={product.stock_count === 0}
                        className="bg-orange-600 hover:bg-orange-700 gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
