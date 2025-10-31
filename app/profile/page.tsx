'use client';

import React from 'react';
import { UserProfileHeader } from './components/UserProfileHeader';
import { ProfileTabsNavigation } from './components/ProfileTabsNavigation';
import { AddressesPanel } from './components/AddressesPanel';
import { OrdersPanel } from './components/OrdersPanel';
import { useProfileTabs } from './hooks/use-profile-tabs';
import { useUserProfile } from './hooks/use-user-profile';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { activeTab, setActiveTab } = useProfileTabs();
  const { profile, loading: profileLoading } = useUserProfile();

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-brand-cream/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Skeleton className="h-16 w-64 mb-8" />
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const userName = `${profile.firstName} ${profile.lastName}`;

  const handleTabChange = (value: string) => {
    if (value === 'addresses' || value === 'orders') {
      setActiveTab(value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-cream/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <UserProfileHeader userName={userName} userEmail={profile.emailAddress} />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <ProfileTabsNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <TabsContent value="addresses" className="mt-0">
            <AddressesPanel />
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            <OrdersPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

