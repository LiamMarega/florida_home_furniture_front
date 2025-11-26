'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { toast } from 'sonner';
import { ProductVariant, Asset } from '@/lib/types';
import { getThumbnailUrl, getFullImageUrl } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  featuredAsset?: Asset | {
    id: string;
    preview: string;
    source?: string;
  };
  variants?: ProductVariant[];
  description?: string;
  price?: number;
  priceWithTax?: number;
  currencyCode?: string;
  hoverAnimation?: boolean;
  showQuickAdd?: boolean;
  imageAspectRatio?: 'square' | 'portrait' | 'landscape';
}

export function ProductCard({
  id,
  name,
  slug,
  featuredAsset,
  variants = [],
  description,
  price,
  priceWithTax,
  currencyCode = 'USD',
  hoverAnimation = true,
  showQuickAdd = true,
  imageAspectRatio = 'square',
}: ProductCardProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addItem } = useCart();

  // Get the first variant ID (most products have a default variant)
  const defaultVariantId = variants[0]?.id;
  // Only show price without tax in product cards - tax is shown only in checkout
  const displayPrice = price || variants[0]?.price;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!defaultVariantId) {
      toast.error('Product variant not available');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(defaultVariantId, 1);
      toast.success(`${name} added to cart!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(price / 100); // Vendure stores prices in cents
  };

  const aspectRatioClass = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
  }[imageAspectRatio];

  return (
    <motion.div
      whileHover={hoverAnimation ? { y: -8, transition: { duration: 0.3 } } : undefined}
      className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-brand transition-all duration-300 h-full flex flex-col relative"
    >
      {/* Product Image - Fixed height */}
      <div className="relative h-40 sm:h-56 md:h-64 lg:h-72 xl:h-80 overflow-hidden bg-brand-cream flex-shrink-0">
        <Link href={`/product/${slug}`} className="block w-full h-full" tabIndex={-1}>
          {featuredAsset?.preview ? (
            <LazyLoadImage
              src={getFullImageUrl(featuredAsset.source || '', featuredAsset.preview)}
              placeholderSrc={getThumbnailUrl(featuredAsset.preview, 50)}
              alt={name}
              effect="blur"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              wrapperClassName="!w-full !h-full"
              threshold={500}
            />
          ) : (
            <div className="w-full h-full bg-brand-cream flex items-center justify-center">
              <Image
                src="/images/logos/ISO.png"
                alt={name}
                width={40}
                height={40}
                className="sm:w-[50px] sm:h-[50px] lg:w-[60px] lg:h-[60px] object-cover opacity-50"
              />
            </div>
          )}
        </Link>

        {/* Quick View Badge */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 sm:p-2 shadow-lg">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-brand-dark-blue" />
          </div>
        </div>
      </div>

      {/* Product Info - Flex grow to fill remaining space */}
      <div className="p-2.5 sm:p-4 md:p-6 flex flex-col flex-grow">
        <Link href={`/product/${slug}`} className="block group-hover:text-brand-primary transition-colors">
          <h3 className="font-bold text-brand-dark-blue text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 line-clamp-2 font-tango-sans min-h-[2.5rem] sm:min-h-[3rem] md:min-h-[3.5rem] flex items-start">
            {name}
          </h3>
        </Link>

        {description && (
          <p className="text-[10px] sm:text-xs md:text-sm text-brand-dark-blue/70 mb-2 sm:mb-3 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3rem] overflow-hidden text-ellipsis">
            {description}
          </p>
        )}

        {/* Price and Button - Always at bottom */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mt-auto pt-1.5 sm:pt-2 gap-1.5 sm:gap-2">
          {(displayPrice && displayPrice > 0) ? (
            <div className="flex-shrink-0 min-w-0">
              <div className="text-[10px] sm:text-xs text-brand-dark-blue/60 mb-0.5 sm:mb-1">Starting at</div>
              <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-brand-dark-blue">
                {formatPrice(displayPrice)}
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 min-w-0">
              <Link href={`/product/${slug}`} className="text-xs sm:text-sm text-brand-dark-blue/70 hover:text-brand-primary underline">
                View details
              </Link>
            </div>
          )}

          {showQuickAdd && defaultVariantId && displayPrice > 0 && (
            <Button
              size="sm"
              className="gap-0.5 sm:gap-1 md:gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-4 flex-shrink-0 h-7 sm:h-8 md:h-9 w-full sm:w-auto z-20 relative"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              aria-label={`Add ${name} to cart`}
            >
              <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">{isAddingToCart ? 'Adding...' : 'Add to Cart'}</span>
              <span className="sm:hidden">{isAddingToCart ? '...' : 'Add'}</span>
            </Button>
          )}
        </div>
      </div>
      {/* Full card link overlay for better UX without nesting issues - hidden to screen readers to avoid double links */}
      <Link
        href={`/product/${slug}`}
        className="absolute inset-0 z-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </motion.div>
  );
}

