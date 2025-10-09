'use client';

import Image from 'next/image';
import Link from 'next/link';
import { collections } from '@/lib/data';

export function CollectionsBento() {
  return (
    <section className="mt-8">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
        {collections.map((collection, index) => {
          const isLarge = collection.rowSpan === 2;
          const gridClasses = isLarge
            ? 'md:col-span-3 md:row-span-2 h-[400px] md:h-[500px]'
            : 'md:col-span-3 h-[200px] md:h-[240px]';

          return (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className={`group relative rounded-lg overflow-hidden shadow-soft hover:shadow-elevated hover:scale-[1.02] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 ${gridClasses}`}
            >
              <Image
                src={collection.image}
                alt={collection.title}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/20" />
              <h3 className="absolute left-5 bottom-4 text-white text-[16px] md:text-[18px] font-semibold drop-shadow-lg max-w-[280px]">
                {collection.title}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
