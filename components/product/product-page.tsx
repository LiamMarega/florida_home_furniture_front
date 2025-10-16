'use client';

import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { ProductHero } from './product-hero';
import { ProductGallery } from './product-gallery';
import { ProductDetails } from './product-details';
import { ProductFeatures } from './product-features';
import { ProductReviews } from './product-reviews';
import { RelatedProducts } from './related-products';
import { fadeInUp, staggerContainer } from '@/lib/animations';

interface ProductPageProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductPage({ product, relatedProducts }: ProductPageProps) {
  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="min-h-screen bg-white"
    >
      {/* Product Hero Section */}
      <motion.section variants={fadeInUp} className="relative">
        <ProductHero product={product} />
      </motion.section>

      {/* Product Gallery and Details */}
      <motion.section 
        variants={fadeInUp}
        className="py-16 bg-white"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Product Gallery */}
            <div className="order-2 lg:order-1">
              <ProductGallery product={product} />
            </div>

            {/* Product Details */}
            <div className="order-1 lg:order-2">
              <ProductDetails product={product} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Product Features */}
      <motion.section 
        variants={fadeInUp}
        className="py-16 bg-gradient-to-b from-white to-brand-cream/30"
      >
        <ProductFeatures product={product} />
      </motion.section>

      {/* Product Reviews */}
      <motion.section 
        variants={fadeInUp}
        className="py-16 bg-white"
      >
        <ProductReviews product={product} />
      </motion.section>

      {/* Related Products */}
      <motion.section 
        variants={fadeInUp}
        className="py-16 bg-gradient-to-b from-white to-brand-cream/20"
      >
        <RelatedProducts products={relatedProducts} />
      </motion.section>
    </motion.main>
  );
}
