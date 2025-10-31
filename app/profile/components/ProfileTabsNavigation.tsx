'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Package } from 'lucide-react';
import { ProfileTab } from '../hooks/use-profile-tabs';

interface ProfileTabsNavigationProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileTabsNavigation({
  activeTab,
  onTabChange,
}: ProfileTabsNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ProfileTab)}>
      <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex mb-6">
        <TabsTrigger
          value="addresses"
          className="flex items-center gap-2 data-[state=active]:bg-brand-cream data-[state=active]:text-brand-dark-blue"
          aria-label="My Addresses tab"
        >
          <MapPin className="h-4 w-4" />
          <span>My Addresses</span>
        </TabsTrigger>
        <TabsTrigger
          value="orders"
          className="flex items-center gap-2 data-[state=active]:bg-brand-cream data-[state=active]:text-brand-dark-blue"
          aria-label="My Orders tab"
        >
          <Package className="h-4 w-4" />
          <span>My Orders</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

