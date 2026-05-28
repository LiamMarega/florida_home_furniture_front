'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ContactField, ContactTextarea } from './contact-field';
import { ContactConsent } from './contact-consent';
import {
  contactFormSchema,
  type ContactFormValues,
} from '@/lib/validators/contact';

const defaultValues: ContactFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  message: '',
  transactionalConsent: false,
  marketingConsent: false,
};

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const onSubmit = async (values: ContactFormValues) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(payload?.error ?? 'Could not send the message.');
        return;
      }

      toast.success('Thanks! We received your message.');
      setSubmitted(true);
      reset(defaultValues);
    } catch (err) {
      console.error('[contact-form] submit error:', err);
      toast.error('Network error. Please try again.');
    }
  };

  return (
    <div className="relative bg-white rounded-xl shadow-elevated border border-brand-cream/70 p-6 md:p-8">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center text-center py-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              className="flex h-16 w-16 items-center justify-center rounded-pill bg-brand-primary/10 text-brand-primary mb-4"
            >
              <CheckCircle2 className="w-8 h-8" />
            </motion.div>
            <h3 className="font-tango-sans text-2xl text-brand-dark-blue">
              Message sent
            </h3>
            <p className="mt-2 text-sm text-brand-dark-blue/70 max-w-sm">
              Our team will review your inquiry and reach back out shortly.
              Thanks for choosing Florida Home Furniture.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setSubmitted(false)}
            >
              Send another message
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div>
              <h2 className="font-tango-sans text-2xl text-brand-dark-blue">
                Enter your details
              </h2>
              <p className="text-sm text-brand-dark-blue/70 mt-1">
                We&apos;ll reply to your email within one business day.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContactField
                id="firstName"
                label="First Name"
                placeholder="First Name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <ContactField
                id="lastName"
                label="Last Name"
                placeholder="Last Name"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <ContactField
              id="phone"
              label="Phone"
              required
              type="tel"
              inputMode="tel"
              placeholder="(305) 123-4567"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <ContactField
              id="email"
              label="Email"
              required
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <ContactTextarea
              id="message"
              label="How can we help?"
              placeholder="Tell us about your project, room, or product question…"
              error={errors.message?.message}
              {...register('message')}
            />

            <Controller
              control={control}
              name="transactionalConsent"
              render={({ field: tField }) => (
                <Controller
                  control={control}
                  name="marketingConsent"
                  render={({ field: mField }) => (
                    <ContactConsent
                      transactional={!!tField.value}
                      marketing={!!mField.value}
                      onTransactionalChange={tField.onChange}
                      onMarketingChange={mField.onChange}
                    />
                  )}
                />
              )}
            />

            <p className="text-[11px] text-brand-dark-blue/60 leading-relaxed">
              Entering a phone number alone does not grant permission to send
              SMS messages. SMS consent is collected separately and is never
              shared with third parties (except SMS providers).
            </p>

            <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 pt-2">
              <div className="text-xs text-brand-dark-blue/70">
                <Link href="/privacy" className="underline hover:text-brand-primary">
                  Privacy Policy
                </Link>
                <span className="mx-2">|</span>
                <Link href="/terms" className="underline hover:text-brand-primary">
                  Terms of Service
                </Link>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send message
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
