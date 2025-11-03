'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, User } from 'lucide-react';

// Checkout components
import { PaymentStep } from '@/components/checkout/payment-step';
import { OrderSummary } from '@/components/checkout/order-summary';
import { CustomerInfoSection } from '@/components/checkout/customer-info-section';
import { ShippingAddressSection } from '@/components/checkout/shipping-address-section';
import { BillingAddressSection } from '@/components/checkout/billing-address-section';
import { ShippingMethodsSection } from '@/components/checkout/shipping-methods-section';

// Hooks and types
import { useShippingMethods } from '@/hooks/use-shipping-methods';
import { useCheckoutProcess } from '@/hooks/use-checkout-process';
import { customerSchema, CustomerFormData, CheckoutStep } from '@/lib/checkout/types';

// Stripe configuration
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const router = useRouter();
  
  // Custom hooks for state management
  const {
    shippingMethods,
    selectedShippingMethod,
    isLoadingShippingMethods,
    setSelectedShippingMethod,
    fetchShippingMethods,
  } = useShippingMethods();

  const {
    clientSecret,
    isProcessing,
    error: checkoutError,
    processCheckout,
    resetCheckout,
  } = useCheckoutProcess();

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: 'US',
      shippingMethodId: '',
    },
  });

  // Fetch shipping methods on component mount
  useEffect(() => {
    fetchShippingMethods();
  }, [fetchShippingMethods]);

  // Update form when shipping method changes
  useEffect(() => {
    if (selectedShippingMethod) {
      setValue('shippingMethodId', selectedShippingMethod);
    }
  }, [selectedShippingMethod, setValue]);

  // Handle form submission
  const onSubmit = async (data: CustomerFormData) => {
    await processCheckout(data, selectedShippingMethod);
  };

  // Handle successful payment
  const handlePaid = (orderCode: string) => {
    router.push(`/checkout/confirmation/${orderCode}`);
  };

  // Handle back to customer info
  const handleBack = () => {
    resetCheckout();
  };

  // Determine current step
  const currentStep = clientSecret ? CheckoutStep.PAYMENT : CheckoutStep.CUSTOMER_INFO;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-32">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h1 className="text-3xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
                <User className="inline-block w-8 h-8 mr-2 mb-1" />
                {currentStep === CheckoutStep.PAYMENT ? 'Payment' : 'Customer Information'}
              </h1>

              {/* Error Display */}
              {checkoutError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{checkoutError}</p>
                </div>
              )}

              {currentStep === CheckoutStep.CUSTOMER_INFO ? (
                /* Customer Information Form */
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <CustomerInfoSection register={register} errors={errors} />
                  
                  <Separator />
                  
                  <ShippingAddressSection register={register} errors={errors} />
                  
                  <Separator />
                  
                  <BillingAddressSection 
                    register={register} 
                    errors={errors} 
                    watch={watch} 
                  />
                  
                  <Separator />
                  
                  <ShippingMethodsSection
                    shippingMethods={shippingMethods}
                    selectedShippingMethod={selectedShippingMethod}
                    isLoadingShippingMethods={isLoadingShippingMethods}
                    onShippingMethodSelect={setSelectedShippingMethod}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold" 
                    disabled={isSubmitting || isProcessing}
                  >
                    {isSubmitting || isProcessing ? (
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
              ) : (
                /* Payment Step */
                clientSecret && typeof clientSecret === 'string' && clientSecret.trim() !== '' ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentStep clientSecret={clientSecret} onPaid={handlePaid} onBack={handleBack} />
                  </Elements>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading payment form...</p>
                  </div>
                )
              )}
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}