'use client';

import { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MailCheck,
  MailWarning,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { clearCheckoutReturn, markCheckoutReturn } from '@/lib/checkout/return-to';
import {
  RESEND_COOLDOWN_SECONDS,
  resolveLoginResult,
  stepDirection,
  type SignInStep,
} from '@/lib/checkout/sign-in-flow';
import { cn } from '@/lib/utils';

interface CheckoutSignInDialogProps {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  onSignedIn: () => void;
  onUseDifferentEmail: () => void;
  /** Lets the page decide where focus lands once the dialog has closed. */
  onCloseAutoFocus?: (event: Event) => void;
}

type Pending = 'signin' | 'retry' | 'send' | 'resend' | null;
type Phase = 'idle' | 'success' | 'complete';
type ButtonPhase = 'idle' | 'loading' | 'done';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SUCCESS_HOLD_MS = 500;
const AUTH_REFRESH_THROTTLE_MS = 1000;

const COPY = {
  invalid: "That password doesn't match this account. Try again or reset it.",
  generic: "We couldn't sign you in right now. Check your connection and try again.",
  sendFailed: "We couldn't send the email. Try again in a moment.",
  notConfirmed: "We haven't seen the confirmation yet. The email can take a minute to arrive.",
  spamHint: "Can't find it? Check your spam or promotions folder.",
} as const;

interface StepMotion {
  dir: 1 | -1;
  reduce: boolean;
}

const stepVariants: Variants = {
  enter: ({ dir, reduce }: StepMotion) =>
    reduce
      ? { opacity: 0 }
      : { opacity: 0, transform: `translateX(${dir * 12}px)`, filter: 'blur(4px)' },
  center: ({ reduce }: StepMotion) =>
    reduce
      ? { opacity: 1, transition: { duration: 0.2 } }
      : {
          opacity: 1,
          transform: 'translateX(0px)',
          filter: 'blur(0px)',
          transition: { duration: 0.2, ease: EASE_OUT },
        },
  exit: ({ dir, reduce }: StepMotion) =>
    reduce
      ? { opacity: 0, transition: { duration: 0.14 } }
      : {
          opacity: 0,
          transform: `translateX(${-dir * 12}px)`,
          filter: 'blur(4px)',
          transition: { duration: 0.14, ease: EASE_OUT },
        },
};

const SHAKE_KEYFRAMES = [
  'translateX(0px)',
  'translateX(-6px)',
  'translateX(6px)',
  'translateX(-4px)',
  'translateX(4px)',
  'translateX(0px)',
];

/** Focuses the first `[data-autofocus]` control of the step that is entering (not the one exiting). */
function focusStepTarget(container: HTMLElement | null, step: SignInStep) {
  container
    ?.querySelector<HTMLElement>(`[data-step="${step}"]`)
    ?.querySelector<HTMLElement>('[data-autofocus]')
    ?.focus();
}

function EmailText({ email }: { email: string }) {
  return <span className="font-medium text-brand-dark-blue break-words">{email}</span>;
}

function StepHeader({
  icon: Icon,
  title,
  descriptionId,
  focusTitle = false,
  children,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  descriptionId: string;
  focusTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Icon className="h-[22px] w-[22px] text-brand-dark-blue/80" strokeWidth={1.75} aria-hidden="true" />
      <DialogTitle
        className="mt-4 font-tango-sans text-2xl font-semibold leading-tight tracking-tight text-brand-dark-blue outline-none"
        tabIndex={focusTitle ? -1 : undefined}
        data-autofocus={focusTitle ? '' : undefined}
      >
        {title}
      </DialogTitle>
      <DialogDescription className="mt-2 text-[15px] leading-relaxed text-brand-dark-blue/75">
        <span id={descriptionId}>{children}</span>
      </DialogDescription>
    </>
  );
}

function TextButton({ className, type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-6 items-center rounded-sm text-sm font-medium text-brand-dark-blue underline-offset-4 tabular-nums hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-brand-dark-blue/60 disabled:no-underline',
        className
      )}
      {...props}
    />
  );
}

function ButtonLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden={!active}
      className={cn(
        'col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,filter] duration-200 ease-out',
        active ? 'opacity-100 blur-0' : 'opacity-0 motion-safe:blur-[2px]'
      )}
    >
      {children}
    </span>
  );
}

/** Full-width primary action whose label crossfades between idle, loading and done. */
function PrimaryButton({
  phase,
  label,
  loadingLabel,
  doneLabel,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  phase: ButtonPhase;
  label: string;
  loadingLabel: string;
  doneLabel?: string;
}) {
  return (
    <Button
      data-autofocus=""
      aria-busy={phase === 'loading' || undefined}
      className={cn(
        'h-11 w-full rounded-lg bg-brand-primary text-[15px] font-semibold text-white hover:bg-brand-primary/90 transition-transform duration-150 ease-out active:scale-[0.97]',
        className
      )}
      {...props}
    >
      <span className="grid place-items-center">
        <ButtonLabel active={phase === 'idle'}>{label}</ButtonLabel>
        <ButtonLabel active={phase === 'loading'}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel}
        </ButtonLabel>
        {doneLabel && (
          <ButtonLabel active={phase === 'done'}>
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {doneLabel}
          </ButtonLabel>
        )}
      </span>
    </Button>
  );
}

export function CheckoutSignInDialog({
  open,
  email,
  onOpenChange,
  onSignedIn,
  onUseDifferentEmail,
  onCloseAutoFocus,
}: CheckoutSignInDialogProps) {
  const { login, isAuthenticated, refetchAuth } = useAuth();
  const reduceMotion = useReducedMotion() ?? false;
  const uid = useId();
  const passwordId = `${uid}-password`;
  const passwordErrorId = `${uid}-password-error`;
  const capsLockId = `${uid}-caps-lock`;
  const descriptionId = (key: SignInStep) => `${uid}-${key}-description`;

  const [step, setStep] = useState<SignInStep>('signin');
  const [dir, setDir] = useState<1 | -1>(1);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loginError, setLoginError] = useState<'invalid' | 'generic' | null>(null);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [pending, setPending] = useState<Pending>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sendFailed, setSendFailed] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [notConfirmedYet, setNotConfirmedYet] = useState(false);
  // One always-mounted live region: text set later is announced reliably.
  const [liveMessage, setLiveMessage] = useState('');
  const [linkResent, setLinkResent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  const contentElement = useRef<HTMLDivElement | null>(null);
  const focusOnStepChange = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const completed = useRef(false);
  const lastAuthRefresh = useRef(0);
  const [shakeScope, animate] = useAnimate<HTMLDivElement>();

  const busy = pending !== null || phase !== 'idle';
  const coolingDown = secondsLeft > 0;
  const resendBlocked = busy || coolingDown;

  // Sign-in finished here (after the "Signed in" beat) or in another tab: tell the page once.
  const notifySignedIn = useEffectEvent(() => {
    if (completed.current) return;
    completed.current = true;
    clearCheckoutReturn();
    onSignedIn();
  });

  useEffect(() => {
    if (phase === 'complete' || (phase === 'idle' && isAuthenticated)) {
      notifySignedIn();
    }
  }, [phase, isAuthenticated]);

  // Confirming or resetting in another tab signs this browser in; notice it on return.
  const refreshAuth = useEffectEvent(() => {
    const time = Date.now();
    if (time - lastAuthRefresh.current < AUTH_REFRESH_THROTTLE_MS) return;
    lastAuthRefresh.current = time;
    refetchAuth();
  });

  useEffect(() => {
    if (!open) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshAuth();
    };
    const onFocus = () => refreshAuth();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [open]);

  // Resend cooldown ticks once per second; the label updates silently.
  useEffect(() => {
    if (!coolingDown) return;
    const id = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [coolingDown]);

  // Keyboard and screen-reader users follow the step change.
  useEffect(() => {
    if (!focusOnStepChange.current) return;
    focusOnStepChange.current = false;
    focusStepTarget(contentElement.current, step);
  }, [step]);

  // Stable so the observer is created once per mount, not on every render.
  const measureContent = useCallback((element: HTMLDivElement | null) => {
    contentElement.current = element;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? element.offsetHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const goTo = (next: SignInStep) => {
    setDir(stepDirection(step, next));
    setStep(next);
    setSendFailed(false);
    setRetryFailed(false);
    setNotConfirmedYet(false);
    setLinkResent(false);
    focusOnStepChange.current = true;
  };

  // Clear first so repeating the same message is announced again.
  const announce = (message: string) => {
    setLiveMessage('');
    window.setTimeout(() => setLiveMessage(message), 60);
  };

  const shakePassword = () => {
    if (reduceMotion || !shakeScope.current) return;
    animate(shakeScope.current, { transform: SHAKE_KEYFRAMES }, { duration: 0.32, ease: 'easeOut' });
  };

  const finishSignIn = () => {
    setPhase('success');
    window.setTimeout(() => setPhase('complete'), SUCCESS_HOLD_MS);
  };

  const attemptLogin = async (mode: 'signin' | 'retry') => {
    if (busy || !password) return;
    setPending(mode);
    setLoginError(null);
    setRetryFailed(false);
    setNotConfirmedYet(false);

    const result = await login(email, password);
    const outcome = resolveLoginResult(result);
    setPending(null);

    if (outcome.kind === 'done') {
      finishSignIn();
      return;
    }

    if (outcome.kind === 'step') {
      if (mode === 'retry') {
        setNotConfirmedYet(true);
        announce(COPY.notConfirmed);
      } else {
        goTo(outcome.step);
      }
      return;
    }

    if (outcome.error === 'invalid') {
      setInvalidAttempts((count) => count + 1);
      setLoginError('invalid');
      if (mode === 'retry') {
        goTo('signin');
        return;
      }
      shakePassword();
      announce(COPY.invalid);
      passwordRef.current?.focus();
      passwordRef.current?.select();
      return;
    }

    if (mode === 'retry') setRetryFailed(true);
    else setLoginError('generic');
    announce(COPY.generic);
  };

  const sendLink = async (kind: 'verification' | 'reset', mode: 'send' | 'resend') => {
    // The resend button stays focusable during the cooldown (aria-disabled), so guard here.
    if (busy || (mode === 'resend' && coolingDown)) return;
    setPending(mode);
    setSendFailed(false);
    setLinkResent(false);

    try {
      const response = await fetch(
        kind === 'verification' ? '/api/auth/resend-verification' : '/api/auth/request-password-reset',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        }
      );
      if (!response.ok) throw new Error('Send failed');

      // The confirm and reset pages bring the shopper back here when they finish.
      markCheckoutReturn();
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      if (mode === 'send') {
        goTo(kind === 'verification' ? 'verification-sent' : 'reset-sent');
      } else {
        setLinkResent(true);
        announce('New link sent');
      }
    } catch {
      setSendFailed(true);
      announce(COPY.sendFailed);
    } finally {
      setPending(null);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange(next);
  };

  const resendLabel = (kind: 'verification' | 'reset') => (
    <TextButton
      onClick={() => sendLink(kind, 'resend')}
      aria-disabled={resendBlocked || undefined}
      className={cn(resendBlocked && 'cursor-not-allowed text-brand-dark-blue/60 hover:no-underline')}
    >
      {pending === 'resend' ? 'Sending…' : coolingDown ? `Resend in ${secondsLeft}s` : 'Resend link'}
    </TextButton>
  );

  const sendError = sendFailed && <p className="mt-4 text-sm text-red-700">{COPY.sendFailed}</p>;

  const resentNote = linkResent && (
    <p className="mt-3 text-center text-sm text-brand-dark-blue/75">New link sent</p>
  );

  const spamHint = <p className="mt-6 text-center text-sm text-brand-dark-blue/75">{COPY.spamHint}</p>;

  const renderStep = () => {
    switch (step) {
      case 'signin': {
        const describedBy = [capsLock && capsLockId, loginError && passwordErrorId].filter(Boolean).join(' ');
        return (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              attemptLogin('signin');
            }}
          >
            <StepHeader icon={LockKeyhole} title="Welcome back" descriptionId={descriptionId('signin')}>
              There&apos;s already an account with this email. Sign in to finish your order.
            </StepHeader>

            {/* Wraps "Not you?" onto its own line instead of splitting the email when space runs out. */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-brand-cream bg-brand-cream/30 px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-brand-dark-blue/80" strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 break-words text-sm font-medium text-brand-dark-blue">{email}</span>
              </span>
              <TextButton onClick={onUseDifferentEmail} disabled={busy} className="ml-auto shrink-0">
                Not you?
              </TextButton>
            </div>

            {/* Lets password managers pair the saved credential with this email. */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={email}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor={passwordId} className="text-brand-dark-blue">
                  Password
                </Label>
                <TextButton onClick={() => goTo('forgot')} disabled={busy}>
                  Forgot password?
                </TextButton>
              </div>
              <div ref={shakeScope} className="relative mt-2">
                <Input
                  ref={passwordRef}
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                  onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                  onBlur={() => setCapsLock(false)}
                  data-autofocus=""
                  aria-invalid={loginError ? true : undefined}
                  aria-describedby={describedBy || undefined}
                  className={cn(
                    'h-11 pr-11 text-base sm:text-sm',
                    loginError && 'border-red-700 focus-visible:ring-red-700'
                  )}
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
              {capsLock && (
                <p id={capsLockId} className="mt-2 text-xs font-medium text-amber-700">
                  Caps Lock is on
                </p>
              )}
              {loginError && (
                <p id={passwordErrorId} className="mt-2 text-sm text-red-700">
                  {loginError === 'invalid' ? COPY.invalid : COPY.generic}
                </p>
              )}
              {loginError === 'invalid' && invalidAttempts >= 2 && (
                <TextButton onClick={() => goTo('forgot')} disabled={busy} className="mt-2">
                  Email me a reset link instead
                </TextButton>
              )}
            </div>

            <PrimaryButton
              type="submit"
              className="mt-6"
              disabled={!password}
              phase={phase !== 'idle' ? 'done' : pending === 'signin' ? 'loading' : 'idle'}
              label="Sign in and continue"
              loadingLabel="Signing in…"
              doneLabel="Signed in"
            />
          </form>
        );
      }

      case 'unverified':
        return (
          <>
            <StepHeader icon={MailWarning} title="Confirm your email first" descriptionId={descriptionId('unverified')}>
              The account for <EmailText email={email} />
              {' '}hasn&apos;t been confirmed yet. We&apos;ll send a fresh confirmation link so you can finish
              signing in.
            </StepHeader>
            {sendError}
            <PrimaryButton
              type="button"
              className="mt-6"
              onClick={() => sendLink('verification', 'send')}
              aria-describedby={descriptionId('unverified')}
              phase={pending === 'send' ? 'loading' : 'idle'}
              label="Send confirmation link"
              loadingLabel="Sending…"
            />
            <div className="mt-4 flex justify-center">
              <TextButton onClick={() => goTo('signin')} disabled={busy}>
                Back to sign in
              </TextButton>
            </div>
          </>
        );

      case 'verification-sent':
        return (
          <>
            <StepHeader icon={MailCheck} title="Check your inbox" descriptionId={descriptionId('verification-sent')}>
              We sent a confirmation link to <EmailText email={email} />
              {'. '}Open it on this device and you&apos;ll be signed in here automatically.
            </StepHeader>
            {notConfirmedYet && <p className="mt-4 text-sm text-brand-dark-blue">{COPY.notConfirmed}</p>}
            {retryFailed && <p className="mt-4 text-sm text-red-700">{COPY.generic}</p>}
            {sendError}
            <PrimaryButton
              type="button"
              className="mt-6"
              onClick={() => attemptLogin('retry')}
              aria-describedby={descriptionId('verification-sent')}
              phase={phase !== 'idle' ? 'done' : pending === 'retry' ? 'loading' : 'idle'}
              label="I've confirmed my email"
              loadingLabel="Checking…"
              doneLabel="Signed in"
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {resendLabel('verification')}
              <TextButton onClick={() => goTo('signin')} disabled={busy}>
                Back to sign in
              </TextButton>
            </div>
            {resentNote}
            {spamHint}
          </>
        );

      case 'forgot':
        return (
          <>
            <StepHeader icon={KeyRound} title="Reset your password" descriptionId={descriptionId('forgot')}>
              We&apos;ll email a link to <EmailText email={email} />
              {' '}so you can choose a new password.
            </StepHeader>
            {sendError}
            <PrimaryButton
              type="button"
              className="mt-6"
              onClick={() => sendLink('reset', 'send')}
              aria-describedby={descriptionId('forgot')}
              phase={pending === 'send' ? 'loading' : 'idle'}
              label="Email me a reset link"
              loadingLabel="Sending…"
            />
            <div className="mt-4 flex justify-center">
              <TextButton onClick={() => goTo('signin')} disabled={busy}>
                Back to sign in
              </TextButton>
            </div>
          </>
        );

      case 'reset-sent':
        return (
          <>
            <StepHeader
              icon={MailCheck}
              title="Check your inbox"
              descriptionId={descriptionId('reset-sent')}
              focusTitle
            >
              If <EmailText email={email} />
              {' '}has an account, a reset link is on its way. Open it on this device, choose a new password, and
              you&apos;ll come right back to checkout, signed in.
            </StepHeader>
            {sendError}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {resendLabel('reset')}
              <TextButton onClick={() => goTo('signin')} disabled={busy}>
                Back to sign in
              </TextButton>
            </div>
            {resentNote}
            {spamHint}
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[420px] gap-0 overflow-hidden rounded-lg border-brand-cream p-0 font-creato-display sm:rounded-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusStepTarget(contentElement.current, step);
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </p>
        <motion.div
          className="overflow-hidden"
          initial={false}
          animate={{ height: reduceMotion ? 'auto' : height }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
        >
          <div ref={measureContent} className="relative">
            <AnimatePresence mode="popLayout" initial={false} custom={{ dir, reduce: reduceMotion }}>
              <motion.div
                key={step}
                data-step={step}
                custom={{ dir, reduce: reduceMotion }}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="p-6 sm:p-8"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
