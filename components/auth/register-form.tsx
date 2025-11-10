'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { ResendVerification } from './resend-verification';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { register: registerUser, openAuthModal, authModalOpen } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Reset success message when modal closes or view changes
  useEffect(() => {
    if (!authModalOpen) {
      setShowSuccess(false);
      setRegisteredEmail(null);
    }
  }, [authModalOpen]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setShowSuccess(false);

    const { confirmPassword, ...registerData } = data;
    const result = await registerUser({
      emailAddress: registerData.email,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      password: registerData.password,
    });

    if (!result.success) {
      // Check if the error is related to email already being registered
      const errorCode = result.errorCode;
      const errorMessage = result.error || result.message || 'Registration failed';
      const isEmailConflict = 
        errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR' ||
        errorCode === 'EMAIL_NOT_VERIFIED' ||
        errorMessage.includes('EMAIL_ADDRESS_CONFLICT_ERROR') ||
        errorMessage.includes('EMAIL_NOT_VERIFIED') ||
        (errorMessage.toLowerCase().includes('email') && 
         (errorMessage.toLowerCase().includes('already') || 
          errorMessage.toLowerCase().includes('exists') ||
          errorMessage.toLowerCase().includes('registered')));

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        toast.error('Email Already Registered', {
          description: 'This email is already registered but not verified. Please check your email for the verification link or try signing in.',
          action: {
            label: 'Sign In',
            onClick: () => openAuthModal('login'),
          },
          duration: 6000,
        });
      } else if (isEmailConflict) {
        toast.error('Email Already Registered', {
          description: 'This email address is already registered. Please sign in instead.',
          action: {
            label: 'Sign In',
            onClick: () => openAuthModal('login'),
          },
        });
      } else {
        toast.error('Registration Failed', {
          description: errorMessage,
        });
      }
      setIsLoading(false);
    } else {
      // Show success message about email verification
      toast.success('Account Created Successfully!', {
        description: 'Please check your email for a verification link. You\'ll need to verify your email before you can log in.',
        duration: 5000,
      });
      setShowSuccess(true);
      setRegisteredEmail(registerData.email);
      reset();
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              placeholder="First name"
              className="pl-10"
              {...register('firstName')}
              disabled={isLoading}
            />
          </div>
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Last name"
            {...register('lastName')}
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="pl-10"
            {...register('email')}
            disabled={isLoading}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            className="pl-10"
            {...register('password')}
            disabled={isLoading}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            className="pl-10"
            {...register('confirmPassword')}
            disabled={isLoading}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      {showSuccess && registeredEmail && (
        <div className="mt-4">
          <ResendVerification email={registeredEmail} />
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Already have an account?{' '}
          <Button
            variant="link"
            className="p-0 h-auto font-medium underline"
            onClick={(e) => {
              e.preventDefault();
              openAuthModal('login');
            }}
            type="button"
          >
            Sign in
          </Button>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;

