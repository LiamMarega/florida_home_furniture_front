import { useState, useMemo } from 'react';
import { Product } from '@/lib/types';

export type SortOption = 'featured' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc';

interface UseProductsGridOptions {
  products: Product[];
  itemsPerPage?: number;
  initialSort?: SortOption;
}

export function useProductsGrid({
  products,
  itemsPerPage = 20,
  initialSort = 'featured',
}: UseProductsGridOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const descriptionMatch = product.description?.toLowerCase().includes(query);
      return nameMatch || descriptionMatch;
    });
  }, [products, searchQuery]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];

    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => {
          const priceA = a.variants[0]?.priceWithTax || 0;
          const priceB = b.variants[0]?.priceWithTax || 0;
          return priceA - priceB;
        });
      case 'price-high':
        return sorted.sort((a, b) => {
          const priceA = a.variants[0]?.priceWithTax || 0;
          const priceB = b.variants[0]?.priceWithTax || 0;
          return priceB - priceA;
        });
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'featured':
      default:
        return sorted;
    }
  }, [filteredProducts, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of products section
    const element = document.getElementById('products-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle search change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle sort change
  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setCurrentPage(1); // Reset to first page on sort change
  };

  return {
    // State
    searchQuery,
    sortBy,
    currentPage,
    
    // Data
    products: paginatedProducts,
    totalProducts: sortedProducts.length,
    totalPages,
    
    // Handlers
    setSearchQuery: handleSearchChange,
    setSortBy: handleSortChange,
    setCurrentPage: handlePageChange,
  };
}

