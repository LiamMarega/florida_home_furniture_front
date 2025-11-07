'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Category {
  name: string;
  href: string;
  productCount?: number;
}

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchAllCategories = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/products/get-categories?all=true');
          if (response.ok) {
            const data = await response.json();
            if (data.categories && data.categories.length > 0) {
              setCategories(data.categories);
            }
          } else {
            console.warn('Failed to fetch categories');
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAllCategories();
    }
  }, [isOpen]);

  const handleCategoryClick = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className="w-full sm:max-w-lg p-0 flex flex-col h-full [&>button]:hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-brand-dark-blue font-tango-sans">
              Menu
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
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-md h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <nav className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <button
                      onClick={() => handleCategoryClick(category.href)}
                      className="w-full text-left px-4 py-3 rounded-md hover:bg-brand-accent/10 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-brand-dark-blue group-hover:text-brand-primary transition-colors">
                          {category.name}
                        </span>
                        {category.productCount !== undefined && category.productCount > 0 && (
                          <span className="text-sm text-brand-dark-blue/60">
                            ({category.productCount})
                          </span>
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </nav>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

