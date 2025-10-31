import { useQuery } from '@tanstack/react-query';
import { GET_ALL_PRODUCTS } from '@/lib/graphql/queries';
import { fetchGraphQL } from '@/lib/vendure-server';

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


// Fetch all products
async function fetchAllProducts(): Promise<DisplayProduct[]> {
  const data = await fetchGraphQL({ query: GET_ALL_PRODUCTS });
  return data.data?.products?.items || [];
}
