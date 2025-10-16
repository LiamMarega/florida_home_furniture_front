'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Zoom, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      {/* Main Image Display */}
      <div className="relative group">
        <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
          {currentImage && (
            <Image
              src={currentImage.preview}
              alt={`${product.name} - Image ${selectedImageIndex + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
        </div>

        {/* Image Overlay Actions */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Zoom className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-black/70 text-white backdrop-blur-sm">
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
            <CarouselContent className="-ml-2 md:-ml-4">
              {allImages.map((image, index) => (
                <CarouselItem key={image.id} className="pl-2 md:pl-4 basis-1/4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                      selectedImageIndex === index
                        ? 'ring-2 ring-brand-primary shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <Image
                      src={image.preview}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 25vw, 12.5vw"
                    />
                    
                    {/* Selected indicator */}
                    {selectedImageIndex === index && (
                      <div className="absolute inset-0 bg-brand-primary/20"></div>
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
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                selectedImageIndex === index
                  ? 'bg-brand-primary w-6'
                  : 'bg-brand-dark-blue/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Product Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          In Stock
        </Badge>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Free Shipping
        </Badge>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
          Premium Quality
        </Badge>
      </div>
    </div>
  );
}
