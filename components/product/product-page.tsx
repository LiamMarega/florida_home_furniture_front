'use client';

import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import { ProductHero } from './product-hero';
import { ProductGallery } from './product-gallery';
import { ProductDetails } from './product-details';
import { ProductFeatures } from './product-features';
import { ProductReviews } from './product-reviews';
import { RelatedProducts } from './related-products';
import { FloatingWhatsApp } from 'react-floating-whatsapp';

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
      className="min-h-screen bg-white w-full"
    >
      {/* Product Gallery and Details */}
      <motion.section 
        variants={fadeInUp}
        className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16">
            {/* Product Gallery */}
            <div className="order-1 md:order-1">
              <ProductGallery product={product} />
            </div>

            {/* Product Details */}
            <div className="order-2 md:order-2">
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
        {/* <ProductReviews product={product} /> */}
      </motion.section>

      {/* Related Products */}
      <motion.section 
        variants={fadeInUp}
        className="py-16 bg-gradient-to-b from-white to-brand-cream/20"
      >
        <RelatedProducts products={relatedProducts} />
      </motion.section>
      <FloatingWhatsApp
                  phoneNumber="+1 (305) 924-0685"
                  accountName="Florida Home Furniture"
                  avatar="/images/favicon/favicon.ico"
                  chatMessage="Hello, how can I help you?"
                  statusMessage="Online"
                  placeholder="Type your message here..."
                />
    </motion.main>
  );
}
