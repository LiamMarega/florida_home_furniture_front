'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderSummary } from '@/components/checkout/order-summary';
import { toast } from 'sonner';
import { Order } from '@/lib/types';
import { ArrowLeft, ArrowRight, Check, CreditCard, Package, Truck, User } from 'lucide-react';
import { useActiveCart } from '@/hooks/use-cart';
import { useQueryClient } from '@tanstack/react-query';

import { 
  useShippingMethods, 
  useSetCustomer, 
  useSetShippingAddress, 
  useSetBillingAddress, 
  useSetShippingMethod, 
  useCreatePaymentIntent 
} from '@/hooks/use-checkout';

// Initialize Stripe with error handling
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  console.error('⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined. Please check your .env.local file.');
}
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type CheckoutStep = 'customer' | 'payment' | 'review';

const steps: CheckoutStep[] = ['customer', 'payment', 'review'];

const customerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  shippingFullName: z.string().min(2, 'Full name is required'),
  shippingStreetLine1: z.string().min(5, 'Street address is required'),
  shippingStreetLine2: z.string().optional(),
  shippingCity: z.string().min(2, 'City is required'),
  shippingProvince: z.string().min(2, 'State/Province is required'),
  shippingPostalCode: z.string().min(3, 'Postal code is required'),
  shippingCountry: z.string().default('US'),
  shippingPhoneNumber: z.string().min(10, 'Phone number is required'),
  billingSameAsShipping: z.boolean().default(true),
  billingFullName: z.string().optional(),
  billingStreetLine1: z.string().optional(),
  billingStreetLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingProvince: z.string().optional(),
  billingPostalCode: z.string().optional(),
  billingCountry: z.string().optional(),
  billingPhoneNumber: z.string().optional(),
  shippingMethodId: z.string().min(1, 'Please select a shipping method'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string;
  priceWithTax: number;
}

export default function CheckoutPage() {
  const [step, setStep] = useState<CheckoutStep>('customer');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();


  // React Query hooks
  const { data: cartData, isLoading: isLoadingCart } = useActiveCart();
  const { data: shippingMethodsData, isLoading: isLoadingShipping } = useShippingMethods();
  const setCustomerMutation = useSetCustomer();
  const setShippingAddressMutation = useSetShippingAddress();
  const setBillingAddressMutation = useSetBillingAddress();
  const setShippingMethodMutation = useSetShippingMethod();
  const createPaymentIntentMutation = useCreatePaymentIntent();

  // Derived state
  const order = cartData?.activeOrder || null;
  const shippingMethods = shippingMethodsData?.shippingMethods || [];

  // Clear clientSecret when navigating away from payment step or on unmount
  useEffect(() => {
    if (step !== 'payment' && clientSecret) {
      console.log('🧹 Clearing clientSecret - no longer on payment step');
      setClientSecret(null);
    }
  }, [step, clientSecret]);

  // Clear clientSecret on component unmount
  useEffect(() => {
    return () => {
      if (clientSecret) {
        console.log('🧹 Clearing clientSecret - component unmounting');
        setClientSecret(null);
      }
    };
  }, [clientSecret]);

  // Clear clientSecret on page load to prevent stale PaymentIntents
  useEffect(() => {
    console.log('🔄 Page loaded, clearing any existing clientSecret to prevent stale PaymentIntents');
    setClientSecret(null);
    
    // Also clear any cached data that might contain stale PaymentIntents
    try {
      // Clear any Stripe-related data from localStorage/sessionStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('stripe') || key.includes('payment')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('stripe') || key.includes('payment')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('🧹 Cleared any cached Stripe/payment data');
    } catch (err) {
      console.log('Could not clear cached data:', err);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: 'US',
    },
  });

  const billingSameAsShipping = watch('billingSameAsShipping');

  useEffect(() => {
    const urlStep = searchParams.get('step') as CheckoutStep;
    if (urlStep && steps.includes(urlStep)) setStep(urlStep);
  }, [searchParams]);

  // Update orderCode when order changes
  useEffect(() => {
    if (order?.code) {
      setOrderCode(order.code);
    }
  }, [order]);

  const goToStep = useCallback((next: CheckoutStep) => {
    setStep(next);
    router.replace(`/checkout?step=${next}`, { scroll: false });
  }, [router]);


  // Reemplazar solo la función onCustomerSubmit

  const onCustomerSubmit = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);
  
      // Set customer information
      console.log('👤 Setting customer...');
      const customerData = await setCustomerMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.email,
        phoneNumber: data.shippingPhoneNumber,
        // forceGuest: true,
      });
      console.log('👤 Customer response:', customerData);
  
      if (customerData.alreadyLoggedIn) {
        console.log('✅ User was logged in, logged out for guest checkout');
      } else {
        console.log('✅ Customer set successfully');
      }
  
      // Set shipping address
      console.log('📍 Setting shipping address...');
      const shippingData = await setShippingAddressMutation.mutateAsync({
        fullName: data.shippingFullName,
        streetLine1: data.shippingStreetLine1,
        streetLine2: data.shippingStreetLine2 || '',
        city: data.shippingCity,
        province: data.shippingProvince,
        postalCode: data.shippingPostalCode,
        country: data.shippingCountry,
        phoneNumber: data.shippingPhoneNumber,
      });
      console.log('📍 Shipping address response:', shippingData);
      console.log('✅ Shipping address set successfully');
  
      // Set billing address if different
      if (!data.billingSameAsShipping) {
        console.log('📍 Setting billing address...');
        await setBillingAddressMutation.mutateAsync({
          fullName: data.billingFullName!,
          streetLine1: data.billingStreetLine1!,
          streetLine2: data.billingStreetLine2 || '',
          city: data.billingCity!,
          province: data.billingProvince!,
          postalCode: data.billingPostalCode!,
          country: data.billingCountry || 'US',
          phoneNumber: data.billingPhoneNumber!,
        });
        console.log('✅ Billing address set successfully');
      }
  
      // Set shipping method
      console.log('🚚 Setting shipping method:', data.shippingMethodId);
      const shippingMethodData = await setShippingMethodMutation.mutateAsync({
        shippingMethodId: data.shippingMethodId,
      });
      console.log('🚚 Shipping method response:', shippingMethodData);
      console.log('✅ Shipping method set successfully');
  
      // 🔑 CRITICAL: Esperar a que las cookies se propaguen
      console.log('⏳ Waiting for cookies to propagate...');
      await new Promise(resolve => setTimeout(resolve, 300));
  
      // 🔄 Invalidar y refetch el cart para asegurar que tenemos la data más fresca
      console.log('🔄 Refetching cart data...');
      await queryClient.invalidateQueries({ queryKey: ['activeCart'] });
      
      // Esperar un poco más para que el refetch complete
      await new Promise(resolve => setTimeout(resolve, 200));
  
      // Verificar que la orden tenga customer antes de proceder
      const freshCart = queryClient.getQueryData(['activeCart']) as any;
      const freshOrder = freshCart?.activeOrder;
      
      console.log('🔍 Fresh order state before payment:', {
        hasOrder: !!freshOrder,
        orderCode: freshOrder?.code,
        hasCustomer: !!freshOrder?.customer,
        hasShippingAddress: !!freshOrder?.shippingAddress,
        customerEmail: freshOrder?.customer?.emailAddress,
      });
  
      // Start payment flow con el email como fallback
      console.log('💳 Starting payment flow...');
      await handleStartPayment(data.email);
      
      console.log('🎉 Checkout submission completed!');
    } catch (error) {
      console.error('💥 Error submitting customer data:', error);
      
      // Logging detallado del error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast.error(error instanceof Error ? error.message : 'Failed to process information');
      
      // No navegamos en caso de error
      return;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartPayment = useCallback(async (guestEmail?: string) => {
    try {
      if (!orderCode) {
        throw new Error('Order not found');
      }

      console.log('💳 Creating payment intent for order:', orderCode);
      console.log('🔍 Current clientSecret before creating new one:', clientSecret);

      // Clear any existing clientSecret before creating a new one
      if (clientSecret) {
        console.log('🧹 Clearing existing clientSecret before creating new payment intent');
        setClientSecret(null);
      }

      const data = await createPaymentIntentMutation.mutateAsync({
        orderCode,
        timestamp: Date.now(),
        forceNew: true,
        emailAddress: guestEmail,
      });
      
      console.log('💳 Payment intent response:', data);
      console.log('✅ New client secret received:', data.clientSecret.substring(0, 20) + '...');
      
      // Extract PaymentIntent ID for debugging
      const paymentIntentId = data.clientSecret.split('_secret_')[0];
      console.log('🆔 New PaymentIntent ID:', paymentIntentId);
      
      // Check if this is the same PaymentIntent ID that was causing issues
      if (paymentIntentId === 'pi_3SKRRfQb3urStgSb1abzIdkO') {
        console.warn('⚠️ WARNING: Received the same PaymentIntent ID that was in terminal state!');
        console.warn('🔄 This might cause the terminal state error. Consider implementing PaymentIntent cancellation.');
      }
      
      setClientSecret(data.clientSecret);
      goToStep('payment');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not initiate payment';
      console.error('💥 Payment initiation error:', errorMessage);
      toast.error(errorMessage);
    }
  }, [orderCode, goToStep, clientSecret, createPaymentIntentMutation]);

  // Auto-create payment intent when on payment step without clientSecret
  useEffect(() => {
    if (step === 'payment' && !clientSecret && orderCode && order) {
      console.log('🔄 Auto-creating payment intent for direct payment step access');
      const possibleEmail = getValues('email');
      handleStartPayment(possibleEmail);
    }
  }, [step, clientSecret, orderCode, order, handleStartPayment, getValues]);

  const getStepIcon = (stepName: CheckoutStep) => {
    switch (stepName) {
      case 'customer':
        return <User className="w-5 h-5" />;
      case 'payment':
        return <CreditCard className="w-5 h-5" />;
      case 'review':
        return <Check className="w-5 h-5" />;
    }
  };

  const getStepTitle = (stepName: CheckoutStep) => {
    switch (stepName) {
      case 'customer':
        return 'Customer Information';
      case 'payment':
        return 'Payment';
      case 'review':
        return 'Review Order';
    }
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="mb-8 pt-20">
      <div className="flex items-center justify-center gap-4">
        {steps.map((stepName, index) => {
          const isActive = step === stepName;
          const isCompleted = steps.indexOf(step) > index;

          return (
            <div key={stepName} className="flex items-center">
              {index > 0 && (
                <div
                  className={`w-12 h-0.5 ${
                    isCompleted ? 'bg-brand-primary' : 'bg-brand-cream'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : isCompleted
                      ? 'bg-brand-primary/20 text-brand-primary'
                      : 'bg-brand-cream text-brand-dark-blue/40'
                  }`}
                >
                  {getStepIcon(stepName)}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-brand-primary' : 'text-brand-dark-blue/60'
                  }`}
                >
                  {getStepTitle(stepName)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Show message if no order
  if (!order && !orderCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="p-8 text-center">
            <Package className="w-16 h-16 text-brand-primary/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-brand-dark-blue mb-4">Cart is Empty</h2>
            <p className="text-brand-dark-blue/70 mb-6">
              Please add items to your cart before proceeding to checkout.
            </p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'customer') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12 ">
        <div className="max-w-6xl mx-auto px-4">
          <StepIndicator />

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="p-8">
                <h1 className="text-3xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
                  <User className="inline-block w-8 h-8 mr-2 mb-1" />
                  Customer Information
                </h1>

                <form onSubmit={handleSubmit(onCustomerSubmit)} className="space-y-6">
                  {/* Customer Info */}
        <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-brand-dark-blue">Contact Information</h2>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          {...register('firstName')}
                          className={errors.firstName ? 'border-red-500' : ''}
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          {...register('lastName')}
                          className={errors.lastName ? 'border-red-500' : ''}
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

          <div>
                      <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
                        {...register('email')}
              placeholder="you@example.com"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Shipping Address */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-brand-dark-blue flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Shipping Address
                    </h2>

                    <div>
                      <Label htmlFor="shippingFullName">Full Name *</Label>
                      <Input
                        id="shippingFullName"
                        {...register('shippingFullName')}
                        className={errors.shippingFullName ? 'border-red-500' : ''}
                      />
                      {errors.shippingFullName && (
                        <p className="text-red-500 text-sm mt-1">{errors.shippingFullName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="shippingStreetLine1">Street Address *</Label>
                      <Input
                        id="shippingStreetLine1"
                        {...register('shippingStreetLine1')}
                        placeholder="123 Main St"
                        className={errors.shippingStreetLine1 ? 'border-red-500' : ''}
                      />
                      {errors.shippingStreetLine1 && (
                        <p className="text-red-500 text-sm mt-1">{errors.shippingStreetLine1.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="shippingStreetLine2">Apartment, suite, etc. (optional)</Label>
                      <Input
                        id="shippingStreetLine2"
                        {...register('shippingStreetLine2')}
                        placeholder="Apt 4B"
            />
          </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="shippingCity">City *</Label>
                        <Input
                          id="shippingCity"
                          {...register('shippingCity')}
                          className={errors.shippingCity ? 'border-red-500' : ''}
                        />
                        {errors.shippingCity && (
                          <p className="text-red-500 text-sm mt-1">{errors.shippingCity.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="shippingProvince">State / Province *</Label>
                        <Input
                          id="shippingProvince"
                          {...register('shippingProvince')}
                          placeholder="FL"
                          className={errors.shippingProvince ? 'border-red-500' : ''}
                        />
                        {errors.shippingProvince && (
                          <p className="text-red-500 text-sm mt-1">{errors.shippingProvince.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="shippingPostalCode">Postal Code *</Label>
                        <Input
                          id="shippingPostalCode"
                          {...register('shippingPostalCode')}
                          placeholder="33101"
                          className={errors.shippingPostalCode ? 'border-red-500' : ''}
                        />
                        {errors.shippingPostalCode && (
                          <p className="text-red-500 text-sm mt-1">{errors.shippingPostalCode.message}</p>
                        )}
                      </div>
                    </div>

          <div>
                      <Label htmlFor="shippingPhoneNumber">Phone Number *</Label>
            <Input
                        id="shippingPhoneNumber"
                        {...register('shippingPhoneNumber')}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className={errors.shippingPhoneNumber ? 'border-red-500' : ''}
                      />
                      {errors.shippingPhoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.shippingPhoneNumber.message}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="billingSameAsShipping"
                        {...register('billingSameAsShipping')}
                        className="w-4 h-4 text-brand-primary focus:ring-brand-primary border-brand-cream rounded"
                      />
                      <Label htmlFor="billingSameAsShipping" className="font-medium cursor-pointer">
                        Billing address same as shipping
                      </Label>
                    </div>

                    {!billingSameAsShipping && (
                      <div className="space-y-4 pl-6">
                        <h3 className="text-lg font-semibold text-brand-dark-blue">Billing Address</h3>
                        
                        <div>
                          <Label htmlFor="billingFullName">Full Name *</Label>
                          <Input id="billingFullName" {...register('billingFullName')} />
                        </div>

                        <div>
                          <Label htmlFor="billingStreetLine1">Street Address *</Label>
                          <Input id="billingStreetLine1" {...register('billingStreetLine1')} />
                        </div>

                        <div>
                          <Label htmlFor="billingStreetLine2">Apartment, suite, etc. (optional)</Label>
                          <Input id="billingStreetLine2" {...register('billingStreetLine2')} />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="billingCity">City *</Label>
                            <Input id="billingCity" {...register('billingCity')} />
                          </div>

                          <div>
                            <Label htmlFor="billingProvince">State / Province *</Label>
                            <Input id="billingProvince" {...register('billingProvince')} />
                          </div>

                          <div>
                            <Label htmlFor="billingPostalCode">Postal Code *</Label>
                            <Input id="billingPostalCode" {...register('billingPostalCode')} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="billingPhoneNumber">Phone Number *</Label>
                          <Input id="billingPhoneNumber" {...register('billingPhoneNumber')} type="tel" />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Shipping Methods */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-brand-dark-blue flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Shipping Method
                    </h2>

                    {shippingMethods.length === 0 && !isLoadingShipping && (
                      <div className="text-center py-4">
                        <p className="text-brand-dark-blue/70 mb-4">No shipping methods available</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => window.location.reload()}
                          className="w-full"
                        >
                          Refresh Page
                        </Button>
                      </div>
                    )}

                    {isLoadingShipping && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                      </div>
                    )}

                    {shippingMethods.length > 0 && (
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <label
                            key={method.id}
                            className="flex items-center gap-4 p-4 border-2 border-brand-cream rounded-lg cursor-pointer hover:border-brand-primary transition-colors"
                          >
                            <input
                              type="radio"
                              value={method.id}
                              {...register('shippingMethodId')}
                              className="w-4 h-4 text-brand-primary focus:ring-brand-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-brand-dark-blue">{method.name}</div>
                              {method.description && (
                                <div className="text-sm text-brand-dark-blue/70">{method.description}</div>
                              )}
                            </div>
                            <div className="font-semibold text-brand-primary">
                              ${(method.priceWithTax / 100).toFixed(2)}
                            </div>
                          </label>
                        ))}
                        {errors.shippingMethodId && (
                          <p className="text-red-500 text-sm">{errors.shippingMethodId.message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isSubmitting || shippingMethods.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            <div className="lg:col-span-1">
              {order && <OrderSummary order={order} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    if (!stripePromise) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <Card className="p-8">
              <div className="text-center space-y-4">
                <div className="text-6xl">⚠️</div>
                <h2 className="text-2xl font-bold text-brand-dark-blue">Payment Configuration Error</h2>
                <p className="text-brand-dark-blue/70">
                  Stripe is not properly configured. Please check your environment variables.
                </p>
                <Button onClick={() => goToStep('customer')} variant="outline">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Customer Information
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    // If no clientSecret, show loading state and create payment intent
    if (!clientSecret) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <StepIndicator />
            
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="p-8">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-primary mx-auto"></div>
                    <h2 className="text-2xl font-bold text-brand-dark-blue">Preparing Payment</h2>
                    <p className="text-brand-dark-blue/70">
                      Setting up your secure payment form...
                    </p>
                  </div>
                </Card>
              </div>
              
              <div className="lg:col-span-1">
                {order && <OrderSummary order={order} showItems={false} />}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <StepIndicator />

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
      <Elements options={{ clientSecret } as StripeElementsOptions} stripe={stripePromise}>
        <PaymentStep
          returnUrl={`${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/checkout/confirmation/${orderCode}`}
          onBack={() => goToStep('customer')}
          onRetryPayment={() => setClientSecret(null)}
        />
      </Elements>
            </div>

            <div className="lg:col-span-1">
              {order && <OrderSummary order={order} showItems={false} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function PaymentStep({ returnUrl, onBack, onRetryPayment }: { returnUrl: string; onBack: () => void; onRetryPayment: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear any existing errors when elements are ready
  useEffect(() => {
    if (elements && error) {
      setError(null);
    }
  }, [elements, error]);

  // Handle Elements initialization errors more gracefully
  useEffect(() => {
    const handleElementsError = (event: any) => {
      console.log('Elements error event:', event);
      if (event.error?.type === 'invalid_request_error' && 
          event.error?.message?.includes('terminal state')) {
        console.error('🚨 PaymentIntent is in terminal state, clearing and retrying...');
        setError('Payment session expired. Please try again.');
        // Clear the clientSecret to force a new payment intent
        setTimeout(() => {
          onRetryPayment();
        }, 1000);
      }
    };

    // Listen for any global Stripe errors
    if (typeof window !== 'undefined') {
      window.addEventListener('stripe-error', handleElementsError);
      return () => {
        window.removeEventListener('stripe-error', handleElementsError);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.warn('⚠️ Stripe or Elements not ready');
      return;
    }

    setLoading(true);
    setError(null);


    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      // If we reach here, it means the payment wasn't successful
      // (successful payments redirect automatically)
      if (result.error) {
        const errorMsg = result.error.message || 'Payment failed';
        console.error('❌ Payment error:', result.error);
        
        // Handle terminal PaymentIntent error specifically
        if (result.error.type === 'invalid_request_error' && 
            errorMsg.includes('terminal state')) {
          setError('This payment session has expired. Please start a new payment.');
        } else {
          setError(errorMsg);
        }
        
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('💥 Payment confirmation error:', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <h1 className="text-3xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
        <CreditCard className="inline-block w-8 h-8 mr-2 mb-1" />
        Payment Information
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border-2 border-brand-cream">
          <PaymentElement
            id="payment-element"
            options={{
              layout: 'tabs',
              business: { name: 'Florida Home Furniture' },
            }}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  // Clear the clientSecret to force a new payment intent
                  onRetryPayment();
                }}
                className="ml-4"
              >
                Retry Payment
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={loading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <Button
            type="submit"
            className="flex-1 h-12 text-lg font-semibold"
            disabled={!stripe || loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              'Complete Payment'
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-brand-dark-blue/60">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Secure payment powered by Stripe
        </div>
      </form>
    </Card>
  );
}
