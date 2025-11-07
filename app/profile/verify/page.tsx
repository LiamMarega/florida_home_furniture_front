'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal, refetchAuth } = useAuth();
  const token = searchParams.get('token');

  const [verificationStatus, setVerificationStatus] = useState<
    'loading' | 'success' | 'error'
  >('loading');
  const [message, setMessage] = useState('');

  // Mutation para verificar email
  const verifyMutation = useMutation({
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
    onSuccess: (data) => {
      setVerificationStatus('success');
      setMessage(data.message || 'Email verified successfully! You can now log in.');
      
      // Refetch auth status to update user state
      refetchAuth();
      
      // Redirigir al home y abrir modal de login después de 2 segundos
      setTimeout(() => {
        router.push('/');
        setTimeout(() => {
          openAuthModal('login');
        }, 100);
      }, 2000);
    },
    onError: (error: Error) => {
      setVerificationStatus('error');
      setMessage(error.message || 'An error occurred during verification');
    },
  });

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Ejecutar verificación cuando el componente se monta
    verifyMutation.mutate(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-cream/20">
        <div className="max-w-md w-full space-y-8 text-center px-6">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-primary" />
          <h2 className="text-2xl font-bold text-brand-dark-blue">
            Verifying your email...
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-cream/20 pt-20">
      <div className="max-w-md w-full space-y-8 text-center px-6">
        {verificationStatus === 'success' ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
            <h2 className="text-2xl font-bold text-brand-dark-blue">
              Email Verified!
            </h2>
            <p className="text-gray-600">{message}</p>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => {
                  router.push('/');
                  setTimeout(() => {
                    openAuthModal('login');
                  }, 100);
                }}
                className="w-full"
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-600" />
            <h2 className="text-2xl font-bold text-brand-dark-blue">
              Verification Failed
            </h2>
            <p className="text-gray-600">{message}</p>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => {
                  router.push('/');
                  setTimeout(() => {
                    openAuthModal('register');
                  }, 100);
                }}
                className="w-full"
              >
                Try Registering Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-cream/20">
          <div className="max-w-md w-full space-y-8 text-center px-6">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-primary" />
            <h2 className="text-2xl font-bold text-brand-dark-blue">
              Loading...
            </h2>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

