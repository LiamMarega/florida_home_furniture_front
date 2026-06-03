'use client';

import { useState, useEffect } from 'react';

export type ProfileTab = 'addresses' | 'orders';

export function useProfileTabs() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('addresses');

  useEffect(() => {
    // Load from localStorage to persist tab selection
    const savedTab = localStorage.getItem('profile-active-tab') as ProfileTab | null;
    if (savedTab && (savedTab === 'addresses' || savedTab === 'orders')) {
      // Reading localStorage on mount is SSR-safe here; deriving in render would cause a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(savedTab);
    }
  }, []);

  const changeTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    localStorage.setItem('profile-active-tab', tab);
  };

  return {
    activeTab,
    setActiveTab: changeTab,
  };
}

