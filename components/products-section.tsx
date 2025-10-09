'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { products } from '@/lib/data';
import { ProductCard } from './ui/product-card';

export function ProductsSection() {
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-[28px] md:text-[32px] font-bold text-[#0A0A0A]">
          Interiors by Prabott.
        </h2>
        <div className="flex gap-2">
          <button
            aria-label="Previous products"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2"
          >
            <ChevronLeft className="w-5 h-5 text-[#0A0A0A]" />
          </button>
          <button
            aria-label="Next products"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2"
          >
            <ChevronRight className="w-5 h-5 text-[#0A0A0A]" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}
