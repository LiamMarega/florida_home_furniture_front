'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfileHeader } from './components/UserProfileHeader';
import { ProfileTabsNavigation } from './components/ProfileTabsNavigation';
import { AddressesPanel } from './components/AddressesPanel';
import { OrdersPanel } from './components/OrdersPanel';
import { useProfileTabs } from './hooks/use-profile-tabs';
import { useUserProfile } from './hooks/use-user-profile';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const router = useRouter();
  const { activeTab, setActiveTab } = useProfileTabs();
  const { profile, loading: profileLoading } = useUserProfile();
  const { isAuthenticated, loading: authLoading, openAuthModal } = useAuth();
  const hasRedirected = useRef(false);

  // Redirect to home and open auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/');
      // Open modal after navigation completes
      const timer = setTimeout(() => {
        openAuthModal('login');
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, router, openAuthModal]);

  // Reset redirect flag if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  // Show loading or redirect if not authenticated
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-brand-cream/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Skeleton className="h-16 w-64 mb-8" />
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64" />
          <div className="sr-only">Checking authentication...</div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-cream/20 pt-20">
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

