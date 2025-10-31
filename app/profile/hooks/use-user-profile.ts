'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '../types';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/user/profile', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated, use mock data or redirect
            setProfile({
              id: 'mock',
              firstName: 'Alex',
              lastName: 'John',
              emailAddress: 'alexjohn@gmail.com',
            });
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfile(data.profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        // Fallback to mock data for development
        setProfile({
          id: 'mock',
          firstName: 'Alex',
          lastName: 'John',
          emailAddress: 'alexjohn@gmail.com',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { profile, loading, error };
}

