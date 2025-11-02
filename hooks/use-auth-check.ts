import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

export const useAuthCheck = (required: boolean = false) => {
  const { isAuthenticated, loading, openAuthModal } = useAuth();

  useEffect(() => {
    if (!loading && required && !isAuthenticated) {
      openAuthModal('login');
    }
  }, [isAuthenticated, loading, required, openAuthModal]);

  return {
    isAuthenticated,
    loading,
    requiresAuth: required && !isAuthenticated && !loading,
  };
};

