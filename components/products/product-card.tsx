'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { toast } from 'sonner';
import { ProductVariant } from '@/lib/types';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  featuredAsset?: {
    id: string;
    preview: string;
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
  const displayPrice = priceWithTax || price || variants[0]?.priceWithTax || variants[0]?.price;

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
      className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-brand transition-all duration-300 h-full flex flex-col"
    >
      <Link href={`/product/${slug}`} className="flex flex-col h-full" prefetch={true}>
        {/* Product Image - Fixed height */}
        <div className="relative h-64 sm:h-72 md:h-80 overflow-hidden bg-brand-cream flex-shrink-0">
          {featuredAsset?.preview ? (
            <Image
              src={featuredAsset.preview}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-brand-cream flex items-center justify-center">
              <Image
                src="/images/logos/ISO.png"
                alt={name}
                width={60}
                height={60}
                className="object-cover opacity-50"
              />
            </div>
          )}

          {/* Quick View Badge */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
              <Eye className="w-4 h-4 text-brand-dark-blue" />
            </div>
          </div>
        </div>

        {/* Product Info - Flex grow to fill remaining space */}
        <div className="p-4 sm:p-6 flex flex-col flex-grow">
          <h3 className="font-bold text-brand-dark-blue text-base sm:text-lg mb-2 line-clamp-2 font-tango-sans group-hover:text-brand-primary transition-colors min-h-[3rem] sm:min-h-[3.5rem] flex items-start">
            {name}
          </h3>

          {description && (
            <p className="text-xs sm:text-sm text-brand-dark-blue/70 mb-3 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] overflow-hidden text-ellipsis">
              {description}
            </p>
          )}

          {/* Price and Button - Always at bottom */}
          <div className="flex items-end justify-between mt-auto pt-2">
            <div className="flex-shrink-0">
              {displayPrice ? (
                <>
                  <div className="text-xs text-brand-dark-blue/60 mb-1">Starting at</div>
                  <div className="text-lg sm:text-xl font-bold text-brand-dark-blue">
                    {formatPrice(displayPrice)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-brand-dark-blue/70">View details</div>
              )}
            </div>

            {showQuickAdd && defaultVariantId && (
              <Button
                size="sm"
                className="gap-1 sm:gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{isAddingToCart ? 'Adding...' : 'Add to Cart'}</span>
                <span className="sm:hidden">{isAddingToCart ? '...' : 'Add'}</span>
              </Button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

