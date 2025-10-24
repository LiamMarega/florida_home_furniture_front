'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { OrderLine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { toast } from 'sonner';

interface CartDrawerItemProps {
  item: OrderLine;
  currencyCode?: string;
}

export function CartDrawerItem({ item, currencyCode }: CartDrawerItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateQuantity, removeItem } = useCart();

  const handleQuantityChange = async (newQuantity: number) => {
    if (isUpdating || newQuantity === item.quantity || newQuantity < 1) return;
    
    try {
      setIsUpdating(true);
      await updateQuantity(item.id, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error updating quantity');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      await removeItem(item.id);
      toast.success('Product removed from cart');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error removing product');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPrice = (price: number, code?: string) => {
    const safeCode =
      (code && /^[A-Z]{3}$/.test(code) ? code : undefined) ??
      (item.productVariant?.currencyCode && /^[A-Z]{3}$/.test(item.productVariant.currencyCode)
        ? item.productVariant.currencyCode
        : undefined) ??
      'USD';

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: safeCode,
      }).format(price / 100);
    } catch {
      return `${(price / 100).toFixed(2)} ${safeCode}`;
    }
  };

  const displayCurrency = currencyCode ?? item.productVariant?.currencyCode ?? 'USD';

  return (
    <motion.div
      layout
      className="flex gap-4 py-6 border-b border-gray-100 last:border-b-0"
    >
      {/* Product Image */}
      <div className="relative w-24 h-24 flex-shrink-0 bg-brand-cream rounded-lg overflow-hidden">
        {item.productVariant.product?.featuredAsset?.preview ? (
          <Image
            src={item.productVariant.product.featuredAsset.preview}
            alt={item.productVariant.product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-brand-dark-blue/60 text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Title and Price Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-brand-dark-blue line-clamp-2 mb-1">
              {item.productVariant.product?.name || item.productVariant.name}
            </h3>
            <p className="text-sm text-brand-dark-blue/70">
              {item.productVariant.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-dark-blue">
              {formatPrice(item.linePriceWithTax, displayCurrency)}
            </p>
          </div>
        </div>

        {/* Quantity Controls and Remove Button */}
        <div className="flex items-center justify-between mt-3">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="h-8 w-8 rounded-full hover:bg-white"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>

            <span className="text-base font-semibold text-brand-dark-blue min-w-[2rem] text-center">
              {item.quantity}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating}
              className="h-8 w-8 rounded-full hover:bg-white"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={isUpdating}
            className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

