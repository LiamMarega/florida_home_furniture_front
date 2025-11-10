'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
  href: string;
}

interface PremiumCollectionProps {
  limit?: number;
}

export function PremiumCollection({ limit = 4 }: PremiumCollectionProps) {
  const { ref, isVisible } = useScrollAnimation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/products/get-collections?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch collections');
        }
        
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError('Failed to load collections');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [limit]);

  if (loading) {
    return (
      <section ref={ref} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-brand-dark-blue/60">Loading collections...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || collections.length === 0) {
    return (
      <section ref={ref} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <p className="text-brand-dark-blue/60">
              {error || 'No collections available at the moment.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Calculate grid columns based on number of collections
  const gridCols = collections.length === 1 
    ? 'md:grid-cols-1' 
    : collections.length === 2 
    ? 'md:grid-cols-2' 
    : collections.length === 3 
    ? 'md:grid-cols-3' 
    : 'md:grid-cols-4';

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-brand-accent/20 px-4 py-2 rounded-full mb-4">
            <span className="text-sm font-semibold text-brand-primary uppercase tracking-wider">
              Quality & Style
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark-blue mb-4 font-tango-sans"
          >
            Our featured collection
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-brand-dark-blue/80 max-w-2xl mx-auto"
          >
            Discover modern, affordable furniture pieces that blend great design with everyday comfort for your home
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-6`}
        >
          {collections.map((item) => (
            <Link key={item.id} href={item.href}>
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative overflow-hidden rounded-2xl md:col-span-1 md:row-span-2 min-h-[300px] cursor-pointer"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-brand-primary/20 to-brand-accent/20"></div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark-blue/80 via-brand-dark-blue/40 to-transparent group-hover:from-brand-dark-blue/90 transition-all duration-300"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-primary text-2xl font-bold mb-2 group-hover:translate-y-0 translate-y-2 transition-transform font-tango-sans">
                    {item.title}
                  </h3>
                  <p className="text-white/90 mb-4 group-hover:translate-y-0 translate-y-2 transition-transform delay-75">
                    {item.description || `Explore our ${item.title} collection`}
                  </p>

                  <div className="flex items-center gap-2 text-brand-accent font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                    <span>View Collection</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mt-12"
        >
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-8 py-4 rounded-full font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-brand"
          >
            View All Collections
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
