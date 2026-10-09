'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { consumeCheckoutReturn } from '@/lib/checkout/return-to';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal, syncSession } = useAuth();
  const token = searchParams.get('token');

  const [verificationStatus, setVerificationStatus] = useState<
    'loading' | 'success' | 'error'
  >('loading');
  const [message, setMessage] = useState('');
  // Verifying signs the user in on this browser, so the login modal is only a fallback.
  const [signedIn, setSignedIn] = useState(false);
  const [returningToCheckout, setReturningToCheckout] = useState(false);

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
    onSuccess: async (data) => {
      // Refetch the session (and the merged cart) before deciding where to go.
      const isSignedIn = await syncSession();

      if (consumeCheckoutReturn()) {
        setReturningToCheckout(true);
        setVerificationStatus('success');
        setMessage('Email confirmed. Taking you back to checkout…');
        setTimeout(() => {
          router.replace('/checkout');
        }, 1200);
        return;
      }

      setSignedIn(isSignedIn);
      setVerificationStatus('success');
      setMessage(
        isSignedIn
          ? "Your email is confirmed and you're signed in."
          : data.message || 'Email verified successfully! You can now log in.'
      );

      // Redirigir al home (y abrir el login solo si hace falta) después de 2 segundos
      setTimeout(() => {
        router.push('/');
        if (!isSignedIn) {
          setTimeout(() => {
            openAuthModal('login');
          }, 100);
        }
      }, 2000);
    },
    onError: (error: Error) => {
      setVerificationStatus('error');
      setMessage(error.message || 'An error occurred during verification');
    },
  });

  // Mount-time verification kickoff; the early-return setState is initial status, not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Ejecutar verificación cuando el componente se monta
    verifyMutation.mutate(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

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
            <p className="text-gray-600" role="status">{message}</p>
            {returningToCheckout ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
            ) : (
              <div className="space-y-3 pt-4">
                {!signedIn && (
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
                )}
                <Button
                  variant={signedIn ? 'default' : 'outline'}
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Continue Shopping
                </Button>
              </div>
            )}
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

