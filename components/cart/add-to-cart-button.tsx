'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { ShoppingCart, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartButtonProps {
  productVariantId: string;
  productName: string;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export function AddToCartButton({
  productVariantId,
  productName,
  disabled = false,
  className,
  size = 'default',
  variant = 'default',
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem, isUpdating, isInCart } = useCart();

  const alreadyInCart = isInCart(productVariantId);

  const handleAddToCart = async () => {
    if (isAdding || isUpdating || alreadyInCart) return;

    try {
      setIsAdding(true);
      await addItem(productVariantId, 1);
      toast.success(`${productName} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error adding to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const isLoading = isAdding;

  return (
    <Button
      onClick={alreadyInCart ? undefined : handleAddToCart}
      disabled={disabled || isLoading}
      size={size}
      variant={alreadyInCart ? 'outline' : variant}
      className={`${className || ''} ${alreadyInCart ? 'border-green-500 text-green-600 hover:bg-green-50 cursor-default' : ''}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </motion.span>
        ) : alreadyInCart ? (
          <motion.span
            key="in-cart"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            <Check className="mr-2 h-4 w-4" />
            In Cart
          </motion.span>
        ) : (
          <motion.span
            key="add"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to cart
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
