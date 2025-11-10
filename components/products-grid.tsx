'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { useProductsGrid } from '@/hooks/use-products-grid';
import { ProductCard } from './products/product-card';
import { ProductsGridFilters } from './products/products-grid-filters';
import { Pagination } from './products/pagination';
import { Product } from '@/lib/types';

interface ProductsGridProps {
  // Customization options
  title?: string;
  subtitle?: string;
  itemsPerPage?: number;
  columnsDesktop?: 2 | 3 | 4 | 5;
  columnsMobile?: 1 | 2;
  showSearch?: boolean;
  showSort?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showQuickAdd?: boolean;
  imageAspectRatio?: 'square' | 'portrait' | 'landscape';
  initialSort?: 'featured' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc' | 'newest';
  className?: string;
  facetValueIds?: string | string[];
  collectionId?: string;
}

export function ProductsGrid({
  title = 'Explore latest collection',
  subtitle = 'Quality furniture that fits your budget and style',
  itemsPerPage = 20,
  columnsDesktop = 4,
  columnsMobile = 2,
  showSearch = true,
  showSort = true,
  showFilters = true,
  showPagination = true,
  showQuickAdd = true,
  imageAspectRatio = 'square',
  initialSort = 'featured',
  className = '',
  facetValueIds,
  collectionId,
}: ProductsGridProps) {
  const { ref, isVisible } = useScrollAnimation();
  
  // Use products grid hook with server-side pagination
  const {
    searchQuery,
    sortBy,
    currentPage,
    products: displayedProducts,
    totalProducts,
    totalPages,
    isLoading,
    isFetching,
    error,
    setSearchQuery,
    setSortBy,
    setCurrentPage,
  } = useProductsGrid({
    itemsPerPage,
    initialSort,
    useServerPagination: true,
    facetValueIds,
    collectionId,
  });

  // Grid column classes based on props
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  };

  const gridClassName = `grid ${gridColsClass[columnsMobile]} md:${gridColsClass[columnsDesktop]} lg:${gridColsClass[columnsDesktop]} gap-3 sm:gap-4 lg:gap-6`;

  return (
    <section id="products-section" ref={ref} className={`py-20 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-12">
            {title && (
              <h2 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-brand-dark-blue/80 mb-8">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        {(showSearch || showSort || showFilters) && (
          <ProductsGridFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            showFiltersButton={showFilters}
            totalResults={totalProducts}
          />
        )}

        {/* Loading State (initial load) */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-brand-dark-blue/60 text-lg">Loading products...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="text-center py-12">
            <p className="text-red-600 text-lg mb-4">Failed to load products</p>
            <p className="text-brand-dark-blue/60">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        ) : displayedProducts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <p className="text-brand-dark-blue/60 text-lg">
              {searchQuery
                ? 'No products found matching your search.'
                : 'No products available at this time.'}
            </p>
          </div>
        ) : (
          /* Products Grid */
          <div className="relative">
            {/* Fetching Overlay - shown when paginating/filtering but not initial load */}
            {isFetching && !isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  <span className="text-brand-dark-blue font-medium">Updating...</span>
                </div>
              </div>
            )}

            <motion.div
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              variants={staggerContainer}
              className={gridClassName}
            >
              {displayedProducts.map((product: Product) => (
                <motion.div key={product.id} variants={staggerItem} className="h-full">
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    featuredAsset={product.featuredAsset}
                    variants={product.variants}
                    description={product.description}
                    showQuickAdd={showQuickAdd}
                    imageAspectRatio={imageAspectRatio}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {showPagination && totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
