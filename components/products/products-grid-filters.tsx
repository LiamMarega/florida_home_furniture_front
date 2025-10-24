'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type SortOption = 'featured' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc';

interface ProductsGridFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onFiltersClick?: () => void;
  showFiltersButton?: boolean;
  totalResults?: number;
}

export function ProductsGridFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onFiltersClick,
  showFiltersButton = true,
  totalResults,
}: ProductsGridFiltersProps) {
  return (
    <div className="mb-8">
      {/* Results Count */}
      {totalResults !== undefined && (
        <div className="mb-4">
          <p className="text-sm text-brand-dark-blue/70">
            {totalResults} {totalResults === 1 ? 'product' : 'products'} found
          </p>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark-blue/60" />
          <Input
            type="text"
            placeholder="Search furniture..."
            className="pl-12 pr-10 h-12 text-base border-brand-cream focus:border-brand-primary focus:ring-brand-primary"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark-blue/60 hover:text-brand-dark-blue"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sort and Filters */}
        <div className="flex gap-4">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-4 py-3 border border-brand-cream rounded-lg bg-white text-brand-dark-blue font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[200px]"
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name-asc">Name: A-Z</option>
            <option value="name-desc">Name: Z-A</option>
          </select>

          {/* Filters Button */}
          {showFiltersButton && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={onFiltersClick}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

