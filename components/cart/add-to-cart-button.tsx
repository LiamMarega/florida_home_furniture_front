'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { ShoppingCart, Loader2 } from 'lucide-react';
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
  const { addItem, isUpdating } = useCart();

  const handleAddToCart = async () => {
    if (isAdding || isUpdating) return;

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

  const isLoading = isAdding || isUpdating;

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isLoading}
      size={size}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to cart
        </>
      )}
    </Button>
  );
}
