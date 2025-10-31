'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderFilter } from '../types';

interface OrderFilterTabsProps {
  activeFilter: OrderFilter;
  onFilterChange: (filter: OrderFilter) => void;
}

export function OrderFilterTabs({
  activeFilter,
  onFilterChange,
}: OrderFilterTabsProps) {
  return (
    <Tabs value={activeFilter} onValueChange={onFilterChange}>
      <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex mb-6">
        <TabsTrigger
          value="current"
          className="data-[state=active]:bg-brand-cream data-[state=active]:text-brand-dark-blue"
          aria-label="Current orders filter"
        >
          Current
        </TabsTrigger>
        <TabsTrigger
          value="unpaid"
          className="data-[state=active]:bg-brand-cream data-[state=active]:text-brand-dark-blue"
          aria-label="Unpaid orders filter"
        >
          Unpaid
        </TabsTrigger>
        <TabsTrigger
          value="all"
          className="data-[state=active]:bg-brand-cream data-[state=active]:text-brand-dark-blue"
          aria-label="All orders filter"
        >
          All Orders
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

