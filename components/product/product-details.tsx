'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react';
import { fadeInUp } from '@/lib/animations';

interface ProductDetailsProps {
  product: Product;
}

const addToCartSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1').max(10, 'Maximum 10 items'),
  variant: z.string().optional(),
});

type AddToCartForm = z.infer<typeof addToCartSchema>;

export function ProductDetails({ product }: ProductDetailsProps) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0]?.id || '');
  const [quantity, setQuantity] = useState(1);

  const {
    handleSubmit,
    formState: { errors },
  } = useForm<AddToCartForm>({
    resolver: zodResolver(addToCartSchema),
    defaultValues: {
      quantity: 1,
      variant: selectedVariant,
    },
  });

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  const mainVariant = product.variants?.find(v => v.id === selectedVariant) || product.variants?.[0];
  const price = mainVariant?.priceWithTax;
  const currencyCode = mainVariant?.currencyCode || 'USD';

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const productSpecs = [
    { label: 'Material', value: 'Premium Wood & Metal' },
    { label: 'Dimensions', value: '120cm × 80cm × 45cm' },
    { label: 'Weight', value: '25kg' },
    { label: 'Color', value: 'Natural Wood Finish' },
    { label: 'Assembly', value: 'Required' },
    { label: 'Warranty', value: '2 Years' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-8"
    >
      {/* Product Title and Price */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
          {product.name}
        </h1>
        
        {price && (
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-brand-primary">
              {formatPrice(price, currencyCode)}
            </span>
            <span className="text-sm text-brand-dark-blue/60">
              (including tax)
            </span>
          </div>
        )}

        {/* Product Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-brand-dark-blue/70">(4.8) • 127 reviews</span>
        </div>
      </div>

      {/* Product Description */}
      <div>
        <h3 className="text-xl font-semibold text-brand-dark-blue mb-3">Description</h3>
        <p className="text-brand-dark-blue/80 leading-relaxed">
          {product.description || 'This beautifully crafted piece combines modern design with timeless elegance. Made from premium materials and finished with attention to detail, it will enhance any space in your home.'}
        </p>
      </div>

      {/* Variant Selection */}
      {product.variants && product.variants.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold text-brand-dark-blue mb-3">Options</h3>
          <div className="space-y-3">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                  selectedVariant === variant.id
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-brand-cream hover:border-brand-primary/50'
                }`}
                onClick={() => setSelectedVariant(variant.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-brand-dark-blue">{variant.name}</h4>
                    <p className="text-sm text-brand-dark-blue/70">SKU: {variant.sku}</p>
                  </div>
                  <span className="font-semibold text-brand-primary">
                    {formatPrice(variant.priceWithTax, variant.currencyCode)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quantity Selection */}
      <div>
        <h3 className="text-lg font-semibold text-brand-dark-blue mb-3">Quantity</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-brand-cream rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="h-10 w-10"
            >
              -
            </Button>
            <span className="px-4 py-2 font-medium text-brand-dark-blue min-w-[3rem] text-center">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= 10}
              className="h-10 w-10"
            >
              +
            </Button>
          </div>
          <span className="text-sm text-brand-dark-blue/70">
            {quantity === 1 ? '1 item' : `${quantity} items`}
          </span>
        </div>
      </div>

      <Separator />

      {/* Add to Cart Section */}
      <div className="space-y-4">
        {selectedVariant && (
          <AddToCartButton
            productVariantId={selectedVariant}
            productName={product.name}
            className="w-full h-12 text-lg font-semibold"
          />
        )}
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 border-2 border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white"
          >
            <Heart className="w-5 h-5 mr-2" />
            Add to Wishlist
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-2 border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <Separator />

      {/* Product Specifications */}
      <div>
        <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Specifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {productSpecs.map((spec, index) => (
            <div key={index} className="flex justify-between py-2 border-b border-brand-cream last:border-b-0">
              <span className="text-brand-dark-blue/70 font-medium">{spec.label}</span>
              <span className="text-brand-dark-blue font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping & Returns */}
      <div className="bg-brand-cream/30 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-brand-dark-blue">Shipping & Returns</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-brand-primary" />
            <span className="text-brand-dark-blue/80">Free shipping on orders over $200</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-brand-primary" />
            <span className="text-brand-dark-blue/80">2-year warranty included</span>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-brand-primary" />
            <span className="text-brand-dark-blue/80">30-day return policy</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
