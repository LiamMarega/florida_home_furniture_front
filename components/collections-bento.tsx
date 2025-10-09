'use client';

import Image from 'next/image';
import Link from 'next/link';

const collections = [
  {
    id: 'beds',
    name: 'Our Beds Collection: Your Sleep Space with Comfort and Style',
    image: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'beds',
    colSpan: 3,
    rowSpan: 2,
  },
  {
    id: 'sofas',
    name: 'Browse Our Sofas Collection',
    image: 'https://images.pexels.com/photos/1648768/pexels-photo-1648768.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'sofas',
    colSpan: 3,
    rowSpan: 2,
  },
  {
    id: 'tables',
    name: 'Our Tables Collection',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'tables',
    colSpan: 3,
    rowSpan: 1,
  },
  {
    id: 'all',
    name: 'See All Collection →',
    image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'all',
    colSpan: 3,
    rowSpan: 1,
  },
];

export function CollectionsBento() {
  return (
    <section className="mt-8">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
        {collections.map((collection) => {
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
                alt={collection.name}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/20" />
              <h3 className="absolute left-5 bottom-4 text-white text-[16px] md:text-[18px] font-semibold drop-shadow-lg max-w-[280px]">
                {collection.name}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
