'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Star, ShoppingCart } from 'lucide-react';
import { vendureClient } from '@/lib/vendure-client';
import { SEARCH_PRODUCTS } from '@/lib/graphql/queries';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { useCart } from '@/contexts/cart-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { SearchResultProduct } from '@/lib/types';

interface DisplayProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currencyCode: string;
  imageUrl: string;
  variantId: string;
  stockLevel: string;
}

export function EnhancedProductsGrid() {
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DisplayProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high'>('featured');
  const { ref, isVisible } = useScrollAnimation();
  const { addItem } = useCart();

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await vendureClient.request<{ search: { items: SearchResultProduct[] } }>(
          SEARCH_PRODUCTS,
          {
            input: {
              term: '',
              take: 50,
              groupByProduct: true,
            },
          }
        );

        if (data.search.items) {
          const displayProducts: DisplayProduct[] = data.search.items.map((item) => ({
            id: item.productId,
            name: item.productName,
            slug: item.slug,
            description: item.description,
            price: item.priceWithTax.value || item.priceWithTax.min || 0,
            currencyCode: item.currencyCode,
            imageUrl: item.productAsset?.preview || 'https://via.placeholder.com/400',
            variantId: item.productId,
            stockLevel: 'IN_STOCK',
          }));

          setProducts(displayProducts);
          setFilteredProducts(displayProducts);
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
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    setFilteredProducts(filtered);
  }, [searchQuery, sortBy, products]);

  const handleAddToCart = async (variantId: string, productName: string) => {
    try {
      await addItem(variantId);
      toast.success(`${productName} added to cart!`);
    } catch (error) {
      toast.error('Failed to add item to cart');
    }
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
              return (
                <motion.div
                  key={product.id}
                  variants={staggerItem}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">
                      {product.name}
                    </h3>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {product.currencyCode === 'GBP' ? '£' : '$'}{(product.price / 100).toFixed(2)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product.variantId, product.name)}
                        disabled={product.stockLevel === 'OUT_OF_STOCK'}
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
