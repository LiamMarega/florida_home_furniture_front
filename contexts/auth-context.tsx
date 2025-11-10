'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  identifier: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string; errorCode?: string; message?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  openAuthModal: (view?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authModalView: 'login' | 'register';
  refetchAuth: () => void;
}

interface RegisterInput {
  emailAddress: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string;
}

interface AuthStatusResponse {
  isAuthenticated: boolean;
  user: User | null;
  customer: Customer | null;
  activeOrder?: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login');
  const queryClient = useQueryClient();

  // Query to check auth status
  const { data: authData, isLoading, refetch } = useQuery<AuthStatusResponse>({
    queryKey: ['auth-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch auth status');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ emailAddress: email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.error || 'Login failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch auth status
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      queryClient.invalidateQueries({ queryKey: ['active-order'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      refetch();
      // Delay closing modal to allow success message to be displayed
      setTimeout(() => {
        closeAuthModal();
      }, 2000);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const response = await fetch('/api/auth/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorObj = error.error || {};
        const errorMessage = typeof errorObj === 'string' 
          ? errorObj 
          : errorObj.message || error.error?.message || 'Registration failed';
        const errorCode = typeof errorObj === 'object' ? errorObj.errorCode : undefined;
        const errorWithCode = new Error(errorMessage) as Error & { errorCode?: string };
        if (errorCode) {
          errorWithCode.errorCode = errorCode;
        }
        throw errorWithCode;
      }

      return response.json();
    },
    onSuccess: () => {
      // Switch to login view after successful registration
      setAuthModalView('login');
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      queryClient.invalidateQueries({ queryKey: ['active-order'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      refetch();
    },
  });

  const login = async (email: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ email, password });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      await registerMutation.mutateAsync(input);
      return {
        success: true,
        message: 'Registration successful. Please login.',
      };
    } catch (error) {
      const errorCode = (error as Error & { errorCode?: string })?.errorCode;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        errorCode,
      };
    }
  };

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Verification failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch auth status
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      refetch();
    },
  });

  const verifyEmail = async (token: string) => {
    try {
      const result = await verifyEmailMutation.mutateAsync(token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear client state even if server logout fails
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
    }
  };

  const openAuthModal = (view: 'login' | 'register' = 'login') => {
    setAuthModalView(view);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const refetchAuth = () => {
    refetch();
  };

  const user = authData?.user || null;
  const customer = authData?.customer || null;
  const isAuthenticated = authData?.isAuthenticated || false;

  const value: AuthContextType = {
    user,
    customer,
    loading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending || verifyEmailMutation.isPending,
    isAuthenticated,
    login,
    register,
    verifyEmail,
    logout,
    openAuthModal,
    closeAuthModal,
    authModalOpen,
    authModalView,
    refetchAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

