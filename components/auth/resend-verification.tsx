'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface ResendVerificationProps {
  email: string;
}

export const ResendVerification: React.FC<ResendVerificationProps> = ({ email }) => {
  const [isSent, setIsSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend verification email');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSent(true);
      setMessage(data.message || 'Verification email sent successfully!');
    },
    onError: (error: Error) => {
      setMessage(error.message || 'Failed to resend verification email');
    },
  });

  const handleResend = async () => {
    setMessage(null);
    await resendMutation.mutateAsync(email);
  };

  return (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">
        Didn&apos;t receive the verification email?
      </p>
      
      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-md ${
            isSent
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-destructive/15 text-destructive'
          }`}
        >
          {message}
        </div>
      )}

      <Button
        variant="outline"
        onClick={handleResend}
        disabled={resendMutation.isPending || isSent}
        size="sm"
        className="w-full"
      >
        {resendMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : isSent ? (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Email Sent!
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Resend Verification Email
          </>
        )}
      </Button>
    </div>
  );
};

