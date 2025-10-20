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
  /** opcional: pásalo desde arriba si lo tenés (order.currencyCode) */
  currencyCode?: string;
}

export function CartItem({ item, currencyCode }: CartItemProps) {
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

  // ✅ util robusto
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
      // fallback ultra defensivo
      return `${(price / 100).toFixed(2)} ${safeCode}`;
    }
  };

  // 👇 usamos un currency “seguro” para todas las llamadas
  const displayCurrency =
    currencyCode ??
    item.productVariant?.currencyCode ??
    'USD';

  return (
    <div className="flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0">
      {/* Product Image */}
      <div className="relative w-12 h-12 flex-shrink-0">
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

      {/* Product Info and Controls */}
      <div className="flex-1 min-w-0">
        {/* Product Name */}
        <h3 className="text-sm font-medium text-brand-dark-blue truncate mb-1">
          {item.productVariant.product?.name || item.productVariant.name}
        </h3>
        
        {/* Variant Name */}
        <p className="text-xs text-brand-dark-blue/70 mb-2">
          {item.productVariant.name}
        </p>

        {/* Price and Quantity Controls Row */}
        <div className="flex items-center justify-between">
          {/* Price */}
          <p className="text-sm font-medium text-brand-dark-blue">
            {formatPrice(item.linePriceWithTax, displayCurrency)}
          </p>

          {/* Quantity Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="h-6 w-6 p-0 border-gray-300 hover:border-gray-400"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
            </Button>

            <span className="text-xs font-medium w-6 text-center">
              {item.quantity}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating}
              className="h-6 w-6 p-0 border-gray-300 hover:border-gray-400"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isUpdating}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
