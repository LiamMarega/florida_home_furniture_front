'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CartDrawerItem } from './cart-drawer-item';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREE_SHIPPING_THRESHOLD = 20000; // $200 in cents

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, itemCount, order, isLoading } = useCart();

  const formatPrice = (price: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  const amountUntilFreeShipping = order 
    ? Math.max(0, FREE_SHIPPING_THRESHOLD - order.totalWithTax)
    : FREE_SHIPPING_THRESHOLD;

  const shippingProgress = order 
    ? Math.min(100, (order.totalWithTax / FREE_SHIPPING_THRESHOLD) * 100)
    : 0;

  const hasItems = items.length > 0;

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg p-0 flex flex-col h-full [&>button]:hidden "
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0 rounded-t-md">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-brand-dark-blue font-tango-sans">
              Your Cart
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-md"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 px-6 py-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/4 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasItems ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="w-24 h-24 rounded-full bg-brand-cream/50 flex items-center justify-center mb-5">
              <ShoppingCart className="h-12 w-12 text-brand-dark-blue/30" />
            </div>
            <h3 className="text-xl font-semibold text-brand-dark-blue mb-2">
              Your cart is empty
            </h3>
            <p className="text-brand-dark-blue/60 mb-6 text-center max-w-xs">
              Discover our curated collection of premium furniture for your home.
            </p>
            <Button
              onClick={onClose}
              className="rounded-md px-8 bg-brand-primary hover:bg-brand-primary/90"
            >
              Browse Products
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Free Shipping Progress */}
            {amountUntilFreeShipping > 0 && (
              <div className="px-6 py-4 bg-brand-accent/10 flex-shrink-0 rounded-md">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium text-brand-dark-blue text-center">
                    You&apos;re only{' '}
                    <span className="text-brand-primary font-bold">
                      {formatPrice(amountUntilFreeShipping, order?.currencyCode)}
                    </span>{' '}
                    away from free shipping
                  </p>
                  <div className="w-full bg-gray-200 rounded-md h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${shippingProgress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-brand-primary to-brand-accent rounded-md"
                    />
                  </div>
                </motion.div>
              </div>
            )}

            {/* {amountUntilFreeShipping <= 0 && (
              <div className="px-6 py-4 bg-green-50 flex-shrink-0">
                <p className="text-sm font-medium text-green-700 text-center">
                  🎉 Your Subscription Product(s) Ship for Free
                </p>
              </div>
            )} */}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <CartDrawerItem 
                      item={item} 
                      currencyCode={order?.currencyCode} 
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer - Subtotal and Checkout */}
            <div className="border-t border-gray-200 px-4 py-4 space-y-3 flex-shrink-0 rounded-b-md">
              {/* Subtotal */}
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold text-brand-dark-blue">
                  Subtotal
                </span>
                <span className="text-base font-semibold text-brand-primary">
                  {order && formatPrice(order.totalWithTax, order.currencyCode)}
                </span>
              </div>

              {/* Tax Notice */}
              <p className="text-xs text-brand-dark-blue/70 text-center">
                Tax included, shipping at checkout
              </p>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                className="w-full h-10 text-base font-semibold rounded-md bg-brand-primary hover:bg-brand-primary/90 shadow-md hover:shadow-lg transition-all duration-300"
              >
                Checkout Now
              </Button>

              {/* Continue Shopping Link */}
             
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
