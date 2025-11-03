'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShoppingCart, Heart } from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  const { ref, isVisible } = useScrollAnimation();

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  if (!products.length) {
    return null;
  }

  return (
    <section ref={ref} className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-brand-accent/20 px-4 py-2 rounded-full mb-4">
            <span className="text-sm font-semibold text-brand-primary uppercase tracking-wider">
              You Might Also Like
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
            Related Products
          </h2>
          
          <p className="text-lg text-brand-dark-blue/80 max-w-2xl mx-auto">
            Discover more beautiful pieces that complement your style
          </p>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12"
        >
          {products.map((product, index) => {
            const mainVariant = product.variants?.[0];
            const price = mainVariant?.priceWithTax;
            const currencyCode = mainVariant?.currencyCode || 'USD';

            return (
              <motion.div
                key={product.id}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-cream"
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-brand-cream">
                  {product.featuredAsset?.preview ? (
                    <Image
                      src={product.featuredAsset.preview}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image
                        src="/images/logos/ISO.png"
                        alt={product.name}
                        width={80}
                        height={80}
                        className="opacity-50"
                      />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-white text-brand-dark-blue hover:bg-brand-primary hover:text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Quick Add
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white text-white hover:bg-white hover:text-brand-dark-blue"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Product Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-brand-primary text-white">
                      New
                    </Badge>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="font-bold text-brand-dark-blue text-lg mb-2 line-clamp-2 font-tango-sans group-hover:text-brand-primary transition-colors">
                    <Link href={`/product/${product.slug}`}>
                      {product.name}
                    </Link>
                  </h3>

                  <p className="text-sm text-brand-dark-blue/70 mb-4 line-clamp-2">
                    {product.description || 'Beautiful furniture piece for your home'}
                  </p>

                  {/* Price */}
                  {price && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-brand-primary">
                        {formatPrice(price, currencyCode)}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className="w-4 h-4 fill-yellow-400 text-yellow-400"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                        <span className="text-sm text-brand-dark-blue/70 ml-1">
                          (4.8)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Link href={`/product/${product.slug}`} className="block">
                    <Button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white group">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All Products Button */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center"
        >
          <Link href="/">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105"
            >
              View All Products
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>

        {/* Newsletter Signup */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mt-20 bg-gradient-to-r from-brand-dark-blue to-brand-primary rounded-3xl p-8 lg:p-12 text-white text-center"
        >
          <h3 className="text-2xl lg:text-3xl font-bold mb-4 font-tango-sans">
            Stay Updated with New Arrivals
          </h3>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Be the first to know about new products, exclusive offers, and design inspiration
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-6 py-4 rounded-full text-brand-dark-blue placeholder-brand-dark-blue/70 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Button
              size="lg"
              className="bg-white text-brand-primary hover:bg-gray-100 px-8 py-4 rounded-full font-semibold whitespace-nowrap"
            >
              Subscribe
            </Button>
          </div>
          
          <p className="text-sm opacity-75 mt-4">
            No spam, unsubscribe at any time
          </p>
        </motion.div>
      </div>
    </section>
  );
}
