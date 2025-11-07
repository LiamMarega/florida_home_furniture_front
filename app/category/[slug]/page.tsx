'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductsGrid } from '@/components/products-grid';

interface CategoryInfo {
  id: string;
  name: string;
  code: string;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [facetValueId, setFacetValueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategoryInfo = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/products/get-category-by-slug?slug=${encodeURIComponent(slug)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Category not found');
          } else {
            setError('Failed to load category');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setCategoryInfo(data);
        setFacetValueId(data.id);
      } catch (err) {
        console.error('Error fetching category:', err);
        setError('Failed to load category');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryInfo();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-dark-blue/60 text-lg">Loading category...</p>
        </div>
      </div>
    );
  }

  if (error || !categoryInfo || !facetValueId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-dark-blue mb-4">Category Not Found</h1>
          <p className="text-brand-dark-blue/60 text-lg mb-8">{error || 'The category you are looking for does not exist.'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10">
      <ProductsGrid
        title={categoryInfo.name}
        subtitle={`Explore our collection of ${categoryInfo.name.toLowerCase()} furniture`}
        itemsPerPage={20}
        columnsDesktop={4}
        columnsMobile={2}
        showSearch={true}
        showSort={true}
        showFilters={true}
        showPagination={true}
        showQuickAdd={true}
        initialSort="featured"
        facetValueIds={facetValueId}
      />
    </div>
  );
}

