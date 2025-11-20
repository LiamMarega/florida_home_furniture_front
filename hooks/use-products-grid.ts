import { useState, useCallback, useEffect } from 'react';
import { useProductsApi } from './use-products-api';
import { useSearch } from '@/contexts/search-context';
import { Product } from '@/lib/types';

export type SortOption = 'featured' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc' | 'newest';

interface UseProductsGridOptions {
  itemsPerPage?: number;
  initialSort?: SortOption;
  useServerPagination?: boolean;
  facetValueIds?: string | string[];
  collectionId?: string;
  initialProducts?: Product[];
  initialPagination?: {
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Hook for managing products grid with server-side pagination and filtering
 * 
 * @param options - Configuration options
 * @param options.itemsPerPage - Number of items per page (default: 20)
 * @param options.initialSort - Initial sort option (default: 'featured')
 * @param options.useServerPagination - Whether to use server-side pagination (default: true)
 * 
 * @example
 * ```tsx
 * const {
 *   products,
 *   isLoading,
 *   searchQuery,
 *   sortBy,
 *   currentPage,
 *   totalPages,
 *   setSearchQuery,
 *   setSortBy,
 *   setCurrentPage,
 * } = useProductsGrid({ itemsPerPage: 12 });
 * ```
 */
export function useProductsGrid({
  itemsPerPage = 20,
  initialSort = 'featured',
  useServerPagination = true,
  facetValueIds,
  collectionId,
  initialProducts,
  initialPagination,
}: UseProductsGridOptions = {}) {
  const { searchQuery: contextSearchQuery, setSearchQuery: setContextSearchQuery } = useSearch();
  const [searchQuery, setSearchQuery] = useState(contextSearchQuery);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sync local search query with context
  useEffect(() => {
    setSearchQuery(contextSearchQuery);
  }, [contextSearchQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Construct initial data object if provided
  const initialApiData = (initialProducts && initialPagination) ? {
    products: initialProducts,
    pagination: {
      page: 1,
      limit: itemsPerPage,
      totalItems: initialPagination.totalItems,
      totalPages: initialPagination.totalPages,
      hasNextPage: initialPagination.totalPages > 1,
      hasPreviousPage: false,
    }
  } : undefined;

  // Fetch products from API with pagination
  const { 
    data, 
    isLoading, 
    error,
    isFetching 
  } = useProductsApi({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch || undefined,
    sort: sortBy,
    facetValueIds,
    collectionId,
    enabled: useServerPagination,
    initialData: initialApiData,
  });

  const products = data?.products || [];
  const pagination = data?.pagination || {
    page: currentPage,
    limit: itemsPerPage,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Handle page change with smooth scroll
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    
    // Scroll to top of products section
    const element = document.getElementById('products-section');
    if (element) {
      const offset = 80; // Account for header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setContextSearchQuery(query);
  }, [setContextSearchQuery]);

  // Handle sort change
  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
    setCurrentPage(1); // Reset to first page on sort change
  }, []);

  return {
    // State
    searchQuery,
    sortBy,
    currentPage,
    
    // Data
    products,
    totalProducts: pagination.totalItems,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPreviousPage: pagination.hasPreviousPage,
    
    // Loading states
    isLoading,
    isFetching,
    error,
    
    // Handlers
    setSearchQuery: handleSearchChange,
    setSortBy: handleSortChange,
    setCurrentPage: handlePageChange,
  };
}


