'use client';

import { useEffect, useEffectEvent, useRef, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';

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
import { AddressSelectorWithModal } from '@/components/checkout/address-selector';
import { CheckoutSignInDialog } from '@/components/checkout/checkout-sign-in-dialog';

// Hooks and types
import { useShippingMethods, useCheckoutProcess } from '@/hooks/use-checkout';
import { customerSchema, CustomerFormData, CheckoutStep } from '@/lib/checkout/types';
import { useSavedAddresses, addressToFormData, formDataToAddress } from '@/hooks/use-saved-addresses';
import { UserAddress } from '@/app/profile/types';
import { useAuth } from '@/contexts/auth-context';

// Stripe configuration
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const normalizeEmail = (value?: string | null) => (value ?? '').trim().toLowerCase();

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, customer } = useAuth();

  // Custom hooks for state management
  const {
    data: shippingData,
    isLoading: isLoadingShippingMethods,
  } = useShippingMethods();

  const shippingMethods = shippingData?.shippingMethods || [];
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');

  const {
    clientSecret,
    orderCode,
    isProcessing,
    error: checkoutError,
    emailConflict,
    clearEmailConflict,
    processCheckout,
    resetCheckout,
  } = useCheckoutProcess();

  // Address persistence
  const {
    addresses: savedAddresses,
    isLoading: isLoadingAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    canAddMore,
  } = useSavedAddresses();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: 'US',
      shippingMethodId: '',
    },
  });

  // Existing-account email: offer sign-in instead of failing checkout.
  const watchedEmail = useWatch({ control, name: 'emailAddress' });
  const [dialogEmail, setDialogEmail] = useState<string | null>(null);
  const [dialogSession, setDialogSession] = useState(0);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [resumeAfterSignIn, setResumeAfterSignIn] = useState(false);
  const focusAfterDialog = useRef<'email' | 'notice' | null>(null);
  const noticeSignInRef = useRef<HTMLButtonElement>(null);

  // Editing the email to another address clears the conflict.
  const conflictEmail =
    emailConflict && normalizeEmail(watchedEmail) === normalizeEmail(emailConflict) ? emailConflict : null;
  const signInDialogOpen = conflictEmail !== null && !conflictDismissed;

  // Handle address selection — declared before the effect below that calls it.
  const handleSelectAddress = useCallback((address: UserAddress) => {
    setSelectedAddressId(address.id);
    setShowAddressForm(false);

    // Auto-populate form fields
    const formData = addressToFormData(address);
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined) {
        setValue(key as keyof CustomerFormData, value as string);
      }
    });
  }, [setValue]);

  // Auto-select default address once saved addresses load (one-time init, not derivable in render).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId && !showAddressForm) {
      // Signing in mid-checkout loads saved addresses: keep an address the shopper already typed.
      if (getValues('shippingStreetLine1')?.trim()) {
        setShowAddressForm(true);
        return;
      }
      const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      handleSelectAddress(defaultAddr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Initialize selected shipping method once async shipping data loads (not derivable in render).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (shippingData?.selectedShippingMethod && !selectedShippingMethod) {
      setSelectedShippingMethod(shippingData.selectedShippingMethod);
    }
  }, [shippingData?.selectedShippingMethod, selectedShippingMethod]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Update form when shipping method changes
  useEffect(() => {
    if (selectedShippingMethod) {
      setValue('shippingMethodId', selectedShippingMethod);
    }
  }, [selectedShippingMethod, setValue]);

  // Handle "add new address" — show empty form
  const handleAddNewAddress = useCallback(() => {
    setSelectedAddressId(null);
    setShowAddressForm(true);

    // Clear shipping fields
    setValue('shippingFullName', '');
    setValue('shippingStreetLine1', '');
    setValue('shippingStreetLine2', '');
    setValue('shippingCity', '');
    setValue('shippingProvince', '');
    setValue('shippingPostalCode', '');
    setValue('shippingCountry', 'US');
    setValue('shippingPhoneNumber', '');
  }, [setValue]);

  // Handle form submission
  const onSubmit = async (data: CustomerFormData) => {
    setResumeAfterSignIn(false);
    const result = await processCheckout(data, selectedShippingMethod);

    if (!result.ok) {
      if (result.reason === 'email-conflict') {
        setDialogEmail(data.emailAddress.trim());
        setDialogSession((session) => session + 1);
        setConflictDismissed(false);
      }
      return;
    }

    // Auto-save address if it's a new one and there's room
    if (!selectedAddressId && canAddMore) {
      try {
        const addressData = formDataToAddress(data);
        await createAddress(addressData);
        toast.success('Address saved for next time');
      } catch {
        // Non-critical — don't block checkout
      }
    }
  };

  const handleSignedIn = () => {
    if (!conflictEmail) return;
    focusAfterDialog.current = null;
    clearEmailConflict();
    setConflictDismissed(false);
    toast.success(`Signed in as ${customer?.firstName || conflictEmail}`);
    setResumeAfterSignIn(true);
  };

  const handleUseDifferentEmail = () => {
    focusAfterDialog.current = 'email';
    clearEmailConflict();
  };

  const handleSignInDialogOpenChange = (open: boolean) => {
    focusAfterDialog.current = open ? null : 'notice';
    setConflictDismissed(!open);
  };

  const handleSignInDialogCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    const target = focusAfterDialog.current;
    focusAfterDialog.current = null;
    if (target === 'email') {
      setFocus('emailAddress', { shouldSelect: true });
    } else if (target === 'notice') {
      noticeSignInRef.current?.focus();
    }
  };

  // After signing in, continue to payment without a second click.
  const resumeCheckout = useEffectEvent(() => {
    void handleSubmit(onSubmit, () => setResumeAfterSignIn(false))();
  });

  useEffect(() => {
    if (resumeAfterSignIn && isAuthenticated) {
      resumeCheckout();
    }
  }, [resumeAfterSignIn, isAuthenticated]);

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

  // Whether to show the address form (always show if no saved addresses)
  const hasAddresses = savedAddresses.length > 0;
  const shouldShowForm = !hasAddresses || showAddressForm || selectedAddressId !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-24 pb-12 sm:py-18">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-4 sm:p-8">
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
                  {conflictEmail && conflictDismissed && (
                    <div
                      role="status"
                      className="rounded-lg border border-brand-cream bg-brand-cream/30 px-4 py-3 text-sm leading-relaxed text-brand-dark-blue"
                    >
                      <span className="font-medium break-all">{conflictEmail}</span> already has an account.{' '}
                      <button
                        ref={noticeSignInRef}
                        type="button"
                        onClick={() => handleSignInDialogOpenChange(true)}
                        className="rounded-sm font-semibold underline underline-offset-4 hover:text-brand-dark-blue/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                      >
                        Sign in
                      </button>{' '}
                      or use a different email.
                    </div>
                  )}

                  <CustomerInfoSection register={register} errors={errors} />

                  <Separator />

                  {/* Address Selector (only shown when user has saved addresses) */}
                  {hasAddresses && (
                    <>
                      <AddressSelectorWithModal
                        addresses={savedAddresses}
                        selectedAddressId={selectedAddressId}
                        onSelect={handleSelectAddress}
                        onCreateAddress={async (addr) => {
                          const result = await createAddress(addr);
                          return result;
                        }}
                        onUpdateAddress={updateAddress}
                        onDeleteAddress={async (id) => {
                          await deleteAddress(id);
                          if (selectedAddressId === id) {
                            setSelectedAddressId(null);
                            setShowAddressForm(true);
                          }
                        }}
                        isLoading={isLoadingAddresses}
                        canAddMore={canAddMore}
                      />
                      <Separator />
                    </>
                  )}

                  {/* Shipping Address Form */}
                  {shouldShowForm && (
                    <>
                      <ShippingAddressSection register={register} errors={errors} />
                      <Separator />
                    </>
                  )}

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
                clientSecret && orderCode && typeof clientSecret === 'string' && clientSecret.trim() !== '' ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentStep clientSecret={clientSecret} orderCode={orderCode} onPaid={handlePaid} onBack={handleBack} />
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

      {dialogEmail && (
        <CheckoutSignInDialog
          key={dialogSession}
          open={signInDialogOpen}
          email={dialogEmail}
          onOpenChange={handleSignInDialogOpenChange}
          onSignedIn={handleSignedIn}
          onUseDifferentEmail={handleUseDifferentEmail}
          onCloseAutoFocus={handleSignInDialogCloseAutoFocus}
        />
      )}
    </div>
  );
}
