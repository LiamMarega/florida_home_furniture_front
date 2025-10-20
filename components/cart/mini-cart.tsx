'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CartItem } from './cart-item';
import { ShoppingCart, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface MiniCartProps {
  className?: string;
}

export function MiniCart({ className }: MiniCartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { items, itemCount, total, order, clearCart, isUpdating } = useCart();

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Error clearing cart');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Cart Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {itemCount}
          </Badge>
        )}
      </Button>

      {/* Cart Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Cart Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-lg font-semibold">Cart ({itemCount})</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="max-h-64 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="py-2">
                  {items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t p-3 space-y-3">
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">Total:</span>
                  <span className="text-base font-semibold">
                    {order && formatPrice(order.totalWithTax, order.currencyCode)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCart}
                    disabled={isUpdating}
                    className="flex-1 text-xs"
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    Clear
                  </Button>
                  <Button asChild size="sm" className="flex-1 text-xs">
                    <Link href="/cart" onClick={() => setIsOpen(false)}>
                      View cart
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
