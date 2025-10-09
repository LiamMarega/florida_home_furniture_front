'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './ui/product-card';

const products = [
  {
    id: '1',
    title: 'WalnutGrace Chair',
    subtitle: 'Chair',
    price: '£450',
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'walnutgrace-chair',
  },
  {
    id: '2',
    title: 'Minimalist Luxe Storage Buffet',
    subtitle: 'Table',
    price: '£2350',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'minimalist-luxe-storage-buffet',
  },
  {
    id: '3',
    title: 'Classic Harmony Sideboard',
    subtitle: 'Table',
    price: '£2350',
    image: 'https://images.pexels.com/photos/6585756/pexels-photo-6585756.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'classic-harmony-sideboard',
  },
  {
    id: '4',
    title: 'ChicHaven Couch',
    subtitle: 'Chair',
    price: '£1450',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'chichaven-couch',
  },
];

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
