'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductsGrid } from '@/components/products-grid';

interface CollectionInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export default function CollectionPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollectionInfo = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/products/get-collection-by-slug?slug=${encodeURIComponent(slug)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Collection not found');
          } else {
            setError('Failed to load collection');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setCollectionInfo(data);
        setCollectionId(data.id);
      } catch (err) {
        console.error('Error fetching collection:', err);
        setError('Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionInfo();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-20">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-dark-blue/60 text-base sm:text-lg">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error || !collectionInfo || !collectionId) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-20">
        <div className="text-center px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark-blue mb-4">Collection Not Found</h1>
          <p className="text-brand-dark-blue/60 text-base sm:text-lg mb-8">{error || 'The collection you are looking for does not exist.'}</p>
          <a
            href="/collections"
            className="inline-block px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors touch-manipulation h-12 flex items-center justify-center"
            aria-label="Go to collections page"
          >
            View All Collections
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-10">
      <ProductsGrid
        title={collectionInfo.name}
        subtitle={collectionInfo.description || `Explore our ${collectionInfo.name} collection`}
        itemsPerPage={20}
        columnsDesktop={4}
        columnsMobile={2}
        showSearch={true}
        showSort={true}
        showFilters={true}
        showPagination={true}
        showQuickAdd={true}
        initialSort="featured"
        collectionId={collectionId}
      />
    </div>
  );
}

