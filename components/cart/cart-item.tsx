'use client';

import { useState } from 'react';
import { OrderLine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface CartItemProps {
  item: OrderLine;
}

export function CartItem({ item }: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateQuantity, removeItem } = useCart();

  const handleQuantityChange = async (newQuantity: number) => {
    if (isUpdating || newQuantity === item.quantity) return;

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

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      {/* Product Image */}
      <div className="relative w-16 h-16 flex-shrink-0">
        {item.productVariant.product?.featuredAsset?.preview ? (
          <Image
            src={item.productVariant.product.featuredAsset.preview}
            alt={item.productVariant.product.name}
            fill
            className="object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-full bg-brand-cream rounded-md flex items-center justify-center">
            <span className="text-brand-dark-blue/60 text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-brand-dark-blue truncate">
          {item.productVariant.product?.name || item.productVariant.name}
        </h3>
        <p className="text-sm text-brand-dark-blue/70">
          {item.productVariant.name}
        </p>
        <p className="text-sm font-medium text-brand-dark-blue">
          {formatPrice(item.unitPriceWithTax, item.productVariant.currencyCode)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={isUpdating || item.quantity <= 1}
          className="h-8 w-8 p-0"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
        </Button>
        
        <span className="text-sm font-medium w-8 text-center">
          {item.quantity}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isUpdating}
          className="h-8 w-8 p-0"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Total Price */}
      <div className="text-right">
        <p className="text-sm font-medium text-brand-dark-blue">
          {formatPrice(item.linePriceWithTax, item.productVariant.currencyCode)}
        </p>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={isUpdating}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
