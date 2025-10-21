import { useQuery } from '@tanstack/react-query';
import { vendureClient } from '@/lib/vendure-client';
import { GET_ALL_PRODUCTS } from '@/lib/graphql/queries';

// Query keys for product operations
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Types
interface DisplayProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset: {
    id: string;
    preview: string;
  };
}

interface ProductsResponse {
  products: {
    items: DisplayProduct[];
  };
}

// Fetch all products
async function fetchAllProducts(): Promise<DisplayProduct[]> {
  const data = await vendureClient.request<ProductsResponse>(GET_ALL_PRODUCTS);
  return data.products.items || [];
}

// Hook to get all products
export function useAllProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: fetchAllProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
