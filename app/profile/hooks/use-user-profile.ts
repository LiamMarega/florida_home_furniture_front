'use client';

import { useQuery } from '@tanstack/react-query';
import { UserProfile } from '../types';

interface ProfileResponse {
  profile: UserProfile;
}

/**
 * Fallback mock profile for development/testing
 */
const mockProfile: UserProfile = {
  id: 'mock',
  firstName: 'Alex',
  lastName: 'John',
  emailAddress: 'alexjohn@gmail.com',
};

/**
 * Fetch user profile from the API
 */
async function fetchProfile(): Promise<ProfileResponse> {
  const response = await fetch('/api/user/profile', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Return mock profile for unauthenticated users (development only)
      return { profile: mockProfile };
    }
    const errorData = await response.json().catch(() => ({
      error: 'Failed to fetch profile',
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch profile');
  }

  return response.json();
}

/**
 * Hook to fetch user profile with React Query
 */
export function useUserProfile() {
  const {
    data,
    isLoading,
    error,
  } = useQuery<ProfileResponse, Error>({
    queryKey: ['user-profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('Authentication') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    // Return mock profile if query fails (for development)
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    profile: data?.profile || mockProfile,
    loading: isLoading,
    error: error?.message || null,
  };
}

