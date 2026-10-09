'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CircleCheck, Eye, EyeOff, KeyRound, Loader2, MailCheck, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { consumeCheckoutReturn } from '@/lib/checkout/return-to';
import { cn } from '@/lib/utils';

// Same rule as the register form.
const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

type ResetStep = 'form' | 'success' | 'expired' | 'link-sent';

const EXPIRED_CODES = new Set([
  'PASSWORD_RESET_TOKEN_EXPIRED_ERROR',
  'PASSWORD_RESET_TOKEN_INVALID_ERROR',
]);

const GENERIC_ERROR = 'Something went wrong. Try again.';

const primaryButtonClass =
  'h-11 w-full rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-transform duration-150 ease-out active:scale-[0.97]';
const iconClass = 'h-[22px] w-[22px] text-brand-dark-blue/80';
const titleClass = 'font-tango-sans text-2xl font-semibold tracking-tight text-brand-dark-blue';
const bodyClass = 'text-[15px] leading-relaxed text-brand-dark-blue/75';

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-cream/20 pt-20 pb-12">
      <div className="max-w-md w-full px-6">
        <div className="rounded-2xl border border-brand-cream bg-white p-6 sm:p-8 shadow-sm font-creato-display">
          {children}
        </div>
      </div>
    </div>
  );
}

function PasswordResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { syncSession, openAuthModal } = useAuth();
  const token = searchParams.get('token');

  const [step, setStep] = useState<ResetStep>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [sentTo, setSentTo] = useState('');

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const onSubmitPassword = async ({ password }: PasswordFormData) => {
    setFormError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (EXPIRED_CODES.has(data.code)) {
          setStep('expired');
          return;
        }
        if (data.code === 'PASSWORD_VALIDATION_ERROR') {
          passwordForm.setError('password', {
            message: data.message || 'Choose a stronger password',
          });
          return;
        }
        setFormError(GENERIC_ERROR);
        return;
      }

      // Vendure signs the user in with the new password; sync before navigating.
      const isSignedIn = await syncSession();
      const backToCheckout = consumeCheckoutReturn();

      setSuccessMessage(
        backToCheckout
          ? 'Password updated. Taking you back to checkout…'
          : isSignedIn
            ? "Password updated. You're signed in."
            : 'Password updated. You can sign in with it now.'
      );
      setStep('success');

      setTimeout(() => {
        if (backToCheckout) {
          router.replace('/checkout');
        } else if (isSignedIn) {
          router.replace('/profile');
        } else {
          router.replace('/');
          setTimeout(() => openAuthModal('login'), 100);
        }
      }, 1200);
    } catch {
      setFormError(GENERIC_ERROR);
    }
  };

  const onSubmitEmail = async ({ email }: EmailFormData) => {
    setFormError(null);
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setFormError("We couldn't send the email. Try again in a moment.");
        return;
      }
      setSentTo(email);
      setStep('link-sent');
    } catch {
      setFormError("We couldn't send the email. Try again in a moment.");
    }
  };

  if (!token) {
    return (
      <PageShell>
        <Unlink className={iconClass} strokeWidth={1.75} aria-hidden="true" />
        <h1 className={cn(titleClass, 'mt-4')}>This reset link is incomplete</h1>
        <p className={cn(bodyClass, 'mt-2')}>
          Open the link from your email again. If it still doesn&apos;t work, request a new one when you sign in.
        </p>
        <Button asChild className={cn(primaryButtonClass, 'mt-8')}>
          <Link href="/">Go to the home page</Link>
        </Button>
      </PageShell>
    );
  }

  if (step === 'success') {
    return (
      <PageShell>
        <CircleCheck className={iconClass} strokeWidth={1.75} aria-hidden="true" />
        <h1 className={cn(titleClass, 'mt-4')}>All set</h1>
        <p className={cn(bodyClass, 'mt-2')} role="status">
          {successMessage}
        </p>
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
      </PageShell>
    );
  }

  if (step === 'link-sent') {
    return (
      <PageShell>
        <MailCheck className={iconClass} strokeWidth={1.75} aria-hidden="true" />
        <h1 className={cn(titleClass, 'mt-4')}>Check your inbox</h1>
        <p className={cn(bodyClass, 'mt-2')} role="status">
          If <span className="font-medium text-brand-dark-blue break-all">{sentTo}</span> has an account,
          a new reset link is on its way.
        </p>
        <p className="mt-4 text-sm text-brand-dark-blue/75">
          Can&apos;t find it? Check your spam or promotions folder.
        </p>
      </PageShell>
    );
  }

  if (step === 'expired') {
    const emailError = emailForm.formState.errors.email?.message;
    return (
      <PageShell>
        <KeyRound className={iconClass} strokeWidth={1.75} aria-hidden="true" />
        <h1 className={cn(titleClass, 'mt-4')}>This link has expired</h1>
        <p className={cn(bodyClass, 'mt-2')}>
          Reset links only work once and for a limited time. Enter your email and we&apos;ll send a fresh one.
        </p>
        <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="mt-8 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-brand-dark-blue">
              Email
            </Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              className="h-11"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'reset-email-error' : undefined}
              {...emailForm.register('email')}
            />
            {emailError && (
              <p id="reset-email-error" role="alert" className="text-sm text-red-700">
                {emailError}
              </p>
            )}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-700">
              {formError}
            </p>
          )}
          <Button type="submit" className={primaryButtonClass} disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Send a new link'
            )}
          </Button>
        </form>
      </PageShell>
    );
  }

  const passwordError = passwordForm.formState.errors.password?.message;
  const isSaving = passwordForm.formState.isSubmitting;

  return (
    <PageShell>
      <KeyRound className={iconClass} strokeWidth={1.75} aria-hidden="true" />
      <h1 className={cn(titleClass, 'mt-4')}>Choose a new password</h1>
      <p className={cn(bodyClass, 'mt-2')}>Pick something you&apos;ll remember. You&apos;ll be signed in right after.</p>
      <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="mt-8 space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-brand-dark-blue">
            New password
          </Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              className="h-11 pr-11"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'new-password-hint new-password-error' : 'new-password-hint'}
              {...passwordForm.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-brand-dark-blue/70 hover:text-brand-dark-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p id="new-password-hint" className="text-sm text-brand-dark-blue/75">
            At least 6 characters.
          </p>
          {passwordError && (
            <p id="new-password-error" role="alert" className="text-sm text-red-700">
              {passwordError}
            </p>
          )}
        </div>
        {formError && (
          <p role="alert" className="text-sm text-red-700">
            {formError}
          </p>
        )}
        <Button type="submit" className={primaryButtonClass} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Save password'
          )}
        </Button>
      </form>
    </PageShell>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-cream/20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" aria-label="Loading" />
        </div>
      }
    >
      <PasswordResetContent />
    </Suspense>
  );
}
