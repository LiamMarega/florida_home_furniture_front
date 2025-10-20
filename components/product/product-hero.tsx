'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { fadeInUp, slideInLeft } from '@/lib/animations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Share2 } from 'lucide-react';
import Link from 'next/link';

interface ProductHeroProps {
  product: Product;
}

export function ProductHero({ product }: ProductHeroProps) {
  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  const mainVariant = product.variants?.[0];
  const price = mainVariant?.priceWithTax;
  const currencyCode = mainVariant?.currencyCode || 'USD';

  return (
    <section className="relative min-h-[60vh] bg-gradient-to-br from-brand-cream via-brand-accent/20 to-brand-dark-blue/50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIzNDQ2NSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Product Image */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideInLeft}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {product.featuredAsset?.preview ? (
                <Image
                  src={product.featuredAsset.preview}
                  alt={product.name}
                  fill
                  className="object-cover rounded-2xl shadow-2xl"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full bg-brand-cream rounded-2xl shadow-2xl flex items-center justify-center">
                  <Image
                    src="/images/logos/ISO.png"
                    alt={product.name}
                    width={120}
                    height={120}
                    className="opacity-50"
                  />
                </div>
              )}
            </div>

            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-4 -right-4"
            >
              <Badge className="bg-brand-primary text-white px-4 py-2 text-sm font-semibold shadow-lg">
                Featured
              </Badge>
            </motion.div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center lg:text-left"
          >
            {/* Breadcrumb */}
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <Link 
                href="/products"
                className="flex items-center gap-2 text-brand-dark-blue/70 hover:text-brand-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">All Products</span>
              </Link>
              <span className="text-brand-dark-blue/30">/</span>
              <span className="text-sm text-brand-dark-blue/70">Product Details</span>
            </div>

            {/* Product Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark-blue mb-4 font-tango-sans leading-tight">
              {product.name}
            </h1>

            {/* Product Description */}
            <p className="text-lg text-brand-dark-blue/80 mb-6 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {product.description || 'Discover this beautiful piece of furniture that combines style, comfort, and functionality for your home.'}
            </p>

            {/* Price */}
            {price && (
              <div className="mb-8">
                <span className="text-3xl sm:text-4xl font-bold text-brand-primary">
                  {formatPrice(price, currencyCode)}
                </span>
                <span className="text-sm text-brand-dark-blue/60 ml-2">
                  (including tax)
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Add to Cart
              </Button>
              
              <div className="flex gap-3 justify-center lg:justify-start">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white px-6 py-4 rounded-full transition-all duration-300"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Wishlist
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white px-6 py-4 rounded-full transition-all duration-300"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Product Tags */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mt-8">
              <Badge variant="secondary" className="bg-brand-accent/20 text-brand-dark-blue">
                Premium Quality
              </Badge>
              <Badge variant="secondary" className="bg-brand-accent/20 text-brand-dark-blue">
                Free Shipping
              </Badge>
              <Badge variant="secondary" className="bg-brand-accent/20 text-brand-dark-blue">
                30-Day Returns
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-brand-accent/20 rounded-full blur-2xl"></div>
    </section>
  );
}
