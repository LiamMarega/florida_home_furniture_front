'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CartDrawer } from './cart-drawer';
import { ShoppingCart } from 'lucide-react';

interface MiniCartProps {
  className?: string;
}

export function MiniCart({ className }: MiniCartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();
  const prevCountRef = useRef(itemCount);
  const controls = useAnimationControls();

  useEffect(() => {
    if (itemCount > prevCountRef.current) {
      controls.start({
        scale: [1, 1.3, 1],
        transition: { duration: 0.3, ease: 'easeInOut' },
      });
    }
    prevCountRef.current = itemCount;
  }, [itemCount, controls]);

  return (
    <>
      {/* Cart Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`relative ${className}`}
      >
        <motion.div animate={controls}>
          <ShoppingCart className="h-5 w-5" />
        </motion.div>
        {itemCount > 0 && (
          <motion.div
            key={itemCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {itemCount}
            </Badge>
          </motion.div>
        )}
      </Button>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
