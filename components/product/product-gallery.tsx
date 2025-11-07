'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';

interface ProductGalleryProps {
  product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Combine featured asset with other assets
  const allImages = [
    ...(product.featuredAsset ? [product.featuredAsset] : []),
    ...(product.assets || []).filter(asset => asset.id !== product.featuredAsset?.id)
  ];

  const currentImage = allImages[selectedImageIndex];

  if (!allImages.length) {
    return (
      <div className="relative aspect-square bg-brand-cream rounded-2xl flex items-center justify-center">
        <Image
          src="/images/logos/ISO.png"
          alt={product.name}
          width={120}
          height={120}
          className="opacity-50"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Image Display */}
      <div className="relative group">
        <div className="relative w-full bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '1 / 1', maxHeight: '400px' }}>
          {currentImage && (
            <Image
              src={currentImage.preview}
              alt={`${product.name} - Image ${selectedImageIndex + 1}`}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
              priority={selectedImageIndex === 0}
              loading={selectedImageIndex === 0 ? undefined : 'lazy'}
              quality={90}
            />
          )}
        </div>

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4">
            <Badge className="bg-black/70 text-white backdrop-blur-sm text-xs sm:text-sm">
              {selectedImageIndex + 1} / {allImages.length}
            </Badge>
          </div>
        )}
      </div>

      {/* Thumbnail Carousel */}
      {allImages.length > 1 && (
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4 p-6 sm:p-10">
              {allImages.map((image, index) => (
                <CarouselItem key={image.id} className="pl-2 md:pl-4 basis-1/4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-300 touch-manipulation ${
                      selectedImageIndex === index
                        ? 'ring-2 ring-brand-primary shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View image ${index + 1} of ${allImages.length}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedImageIndex(index);
                      }
                    }}
                  >
                    <Image
                      src={image.preview}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 25vw, (max-width: 1024px) 12.5vw, 150px"
                      loading="lazy"
                      quality={75}
                    />
                    
                    {/* Selected indicator */}
                    {selectedImageIndex === index && (
                      <div className="absolute inset-2 bg-brand-primary/20 rounded-md"></div>
                    )}
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {allImages.length > 4 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        </div>
      )}

      {/* Image Navigation for Mobile */}
      {allImages.length > 1 && (
        <div className="flex justify-center gap-2 md:hidden">
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 touch-manipulation ${
                selectedImageIndex === index
                  ? 'bg-brand-primary w-6'
                  : 'bg-brand-dark-blue/30 w-2'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Product Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs sm:text-sm">
          In Stock
        </Badge>
      
        <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs sm:text-sm">
          Premium Quality
        </Badge>
      </div>
    </div>
  );
}
