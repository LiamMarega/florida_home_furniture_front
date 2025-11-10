import { useQuery } from '@tanstack/react-query';
import { Product } from '@/lib/types';

// Query keys for product operations
export const productApiKeys = {
  all: ['products-api'] as const,
  lists: () => [...productApiKeys.all, 'list'] as const,
  list: (filters: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    facetValueIds?: string | string[];
    collectionId?: string;
  }) => [...productApiKeys.lists(), filters] as const,
};

interface PaginatedProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface UseProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'featured' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc' | 'newest';
  facetValueIds?: string | string[];
  collectionId?: string;
  enabled?: boolean;
}

/**
 * Fetch paginated products from the API
 */
async function fetchProducts(options: UseProductsOptions): Promise<PaginatedProductsResponse> {
  const params = new URLSearchParams();
  
  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.search) params.set('search', options.search);
  if (options.sort) params.set('sort', options.sort);
  if (options.facetValueIds) {
    const ids = Array.isArray(options.facetValueIds) 
      ? options.facetValueIds.join(',') 
      : options.facetValueIds;
    params.set('facetValueIds', ids);
  }
  if (options.collectionId) {
    params.set('collectionId', options.collectionId);
  }

  const response = await fetch(`/api/products?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch products' }));
    throw new Error(error.error || 'Failed to fetch products');
  }

  return response.json();
}

/**
 * Hook to fetch paginated products from the API
 * 
 * @param options - Query options including page, limit, search, and sort
 * @returns Query result with products and pagination data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useProductsApi({
 *   page: 1,
 *   limit: 20,
 *   search: 'sofa',
 *   sort: 'price-low'
 * });
 * ```
 */
export function useProductsApi(options: UseProductsOptions = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    sort = 'featured',
    facetValueIds,
    collectionId,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: productApiKeys.list({ page, limit, search, sort, facetValueIds, collectionId }),
    queryFn: () => fetchProducts({ page, limit, search, sort, facetValueIds, collectionId }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}

