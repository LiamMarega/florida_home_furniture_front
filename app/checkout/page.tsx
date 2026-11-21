'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, User } from 'lucide-react';

// Checkout components
import { PaymentInOtherTabNotice, PaymentMethodSelector } from '@/components/checkout/payment-method-selector';
import { AffirmReturnNotice } from '@/components/checkout/affirm-payment';
import {
  AffirmFinishingNotice,
  useAffirmResume,
  usePendingAffirmOrder,
  type AffirmResumeAction,
} from '@/components/checkout/affirm-resume';
import { OrderSummary } from '@/components/checkout/order-summary';
import { CustomerInfoSection } from '@/components/checkout/customer-info-section';
import { ShippingAddressSection } from '@/components/checkout/shipping-address-section';
import { BillingAddressSection } from '@/components/checkout/billing-address-section';
import { NO_SHIPPING_METHOD_ID, ShippingMethodsSection } from '@/components/checkout/shipping-methods-section';
import { AddressSelectorWithModal } from '@/components/checkout/address-selector';

// Hooks and types
import { useShippingMethods, useCheckoutProcess } from '@/hooks/use-checkout';
import { usePaymentLock } from '@/hooks/use-payment-lock';
import { useCart } from '@/contexts/cart-context';
import { customerSchema, CustomerFormData, CheckoutStep } from '@/lib/checkout/types';
import { useSavedAddresses, addressToFormData, formDataToAddress } from '@/hooks/use-saved-addresses';
import { UserAddress } from '@/app/profile/types';

export default function CheckoutPage() {
  const router = useRouter();

  // Custom hooks for state management
  const {
    data: shippingData,
    isPending: isLoadingShippingMethods,
    isError: shippingMethodsError,
    isFetching: isFetchingShippingMethods,
    refetch: refetchShippingMethods,
  } = useShippingMethods();

  const shippingMethods = shippingData?.shippingMethods || [];
  // The list could not load (and none loaded before): the section offers a retry.
  const shippingMethodsLoadFailed = shippingMethodsError && !shippingData;
  // The order has no shipping method to choose, so payment cannot start: continuing is blocked and the section
  // says how to reach the store.
  const noShippingMethod = !!shippingData && shippingMethods.length === 0;
  // The shopper's explicit choice; until then, the method the order already has (so the page never
  // shows a shipping price other than the one the order charges), else the first eligible one.
  const [chosenShippingMethod, setChosenShippingMethod] = useState<string>('');

  const {
    clientSecret,
    orderCode,
    paymentMethods,
    isProcessing,
    error: checkoutError,
    processCheckout,
    resetCheckout,
  } = useCheckoutProcess();

  // A failed step is announced and brought into view whenever its message changes (each attempt clears it first),
  // so it is never missed below the fold, as on a phone where the button is far from the top of the form.
  const stepErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!checkoutError) return;
    stepErrorRef.current?.focus({ preventScroll: true });
    stepErrorRef.current?.scrollIntoView({ block: 'center' });
  }, [checkoutError]);

  // Active order (same data as the order summary); its total feeds Affirm's payment messaging
  const { order: cartOrder, isLoading: isLoadingCart } = useCart();

  const savedShippingMethodId = cartOrder?.shippingLines?.[0]?.shippingMethod?.id;
  const selectedShippingMethod =
    chosenShippingMethod ||
    (savedShippingMethodId && shippingMethods.some((method) => method.id === savedShippingMethodId)
      ? savedShippingMethodId
      : shippingData?.selectedShippingMethod || '');

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
    trigger,
    getFieldState,
    subscribe,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: 'US',
      shippingMethodId: '',
    },
  });

  // Handle address selection — declared before the effect below that calls it.
  const handleSelectAddress = useCallback((address: UserAddress) => {
    setSelectedAddressId(address.id);
    setShowAddressForm(false);

    // Auto-populate form fields, then check them at once: a saved address outside the US or with a field to fix
    // says what to fix as soon as it is chosen.
    const formData = addressToFormData(address);
    const fields = Object.keys(formData) as (keyof CustomerFormData)[];
    fields.forEach((field) => setValue(field, formData[field] as string));
    void trigger(fields);
  }, [setValue, trigger]);

  // Before the first submit the form checks nothing as the shopper types: a field flagged when an address was
  // chosen is checked again on each change, so its message goes away once it is right.
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ name, type }) => {
          const field = name as keyof CustomerFormData | undefined;
          if (type === 'change' && field && getFieldState(field).error) {
            void trigger(field);
          }
        },
      }),
    [subscribe, getFieldState, trigger]
  );

  // Auto-select default address once saved addresses load (one-time init, not derivable in render).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId && !showAddressForm) {
      const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      handleSelectAddress(defaultAddr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses]);
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

  // Determine current step (the order code is set once the order is ready for payment)
  const currentStep = orderCode ? CheckoutStep.PAYMENT : CheckoutStep.CUSTOMER_INFO;

  // A payment of the active order is in flight: another tab pays it ('elsewhere'), or this tab does or just did
  // with an unknown outcome ('mine', until its lock expires). Nothing here may change the order meanwhile.
  const activeOrderCode = cartOrder?.code ?? null;
  const paymentLock = usePaymentLock(activeOrderCode);
  const paymentElsewhere = paymentLock === 'elsewhere';

  // An Affirm payment this browser started but never settled (refresh, closed tab, lost answer) is finished
  // here before anything else; on the payment step the payment forms handle their own attempts.
  const resumeAction: AffirmResumeAction =
    currentStep !== CheckoutStep.CUSTOMER_INFO
      ? 'wait'
      : cartOrder?.state === 'ArrangingPayment'
        ? 'resume'
        : cartOrder?.state === 'AddingItems'
          ? // The cart changed after Affirm approved it: that approval no longer matches the order.
            'discard'
          : 'wait';
  const affirmResume = useAffirmResume({
    orderCode: activeOrderCode,
    action: resumeAction,
    onOutcome: (outcome, resumedOrderCode) => {
      if (outcome.outcome === 'paid') {
        router.push(`/checkout/confirmation/${outcome.orderCode}`);
      } else if (outcome.outcome === 'unknown') {
        // The confirmation page decides from the real order state.
        router.push(`/checkout/confirmation/${resumedOrderCode}`);
      }
    },
  });
  const resumeRejection = affirmResume.outcome?.outcome === 'rejected' ? affirmResume.outcome.error : null;
  // An unsettled Affirm token of another order (a refresh mid-payment, after which that order may be placed
  // and no longer the cart): point to its status instead of an empty checkout that invites paying again.
  const pendingAffirmOrder = usePendingAffirmOrder();
  const otherPendingAffirmOrder =
    !isLoadingCart && pendingAffirmOrder && pendingAffirmOrder !== activeOrderCode ? pendingAffirmOrder : null;

  // Handle form submission. processCheckout never throws (a failed step shows its message above the form), so
  // the submit handler never leaves an unhandled rejection behind.
  const onSubmit = async (data: CustomerFormData) => {
    if (!(await processCheckout(data, selectedShippingMethod))) return;

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

  // The country has no input to type in: when it is a field to fix, its line is focused and its message brought into
  // view (react-hook-form then focuses the first other field to fix, if any).
  const onInvalid = (formErrors: FieldErrors<CustomerFormData>) => {
    if (formErrors.shippingCountry) {
      const country = document.getElementById('shippingCountry');
      country?.focus({ preventScroll: true });
      country?.scrollIntoView({ block: 'center' });
    }
  };

  // Handle successful payment
  const handlePaid = (orderCode: string) => {
    router.push(`/checkout/confirmation/${orderCode}`);
  };

  // Handle back to customer info
  const handleBack = () => {
    resetCheckout();
  };

  // A new payment attempt (card or Affirm) drops the notice left by Affirm's redirect (?affirm=...).
  // Read from window instead of useSearchParams, which would need a Suspense boundary around the page.
  const handlePaymentStart = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('affirm')) return;
    url.searchParams.delete('affirm');
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };

  // Whether to show the address form (always show if no saved addresses)
  const hasAddresses = savedAddresses.length > 0;
  const shouldShowForm = !hasAddresses || showAddressForm || selectedAddressId !== null;

  // A stored Affirm token is being sent, or sent again automatically after a short wait.
  const affirmResumeBusy = affirmResume.finishing || affirmResume.retrying;
  const continueBlocked = affirmResumeBusy || paymentLock !== 'free';
  // This tab's payment of the order is still unsettled (e.g. a reload right after an unknown card outcome) and no
  // other notice says so.
  const ownPaymentPending =
    currentStep === CheckoutStep.CUSTOMER_INFO && paymentLock === 'mine' && !affirmResumeBusy && !!activeOrderCode;

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
                <div
                  ref={stepErrorRef}
                  role="alert"
                  tabIndex={-1}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg outline-none"
                >
                  <p className="text-red-600 text-sm">{checkoutError}</p>
                </div>
              )}

              {/* An Affirm payment of this order is being finished (resumed after a refresh), or retried automatically */}
              {affirmResumeBusy && <AffirmFinishingNotice className="mb-6" retrying={!affirmResume.finishing} />}
              {ownPaymentPending && (
                <div role="status" className="mb-6 p-4 border rounded-lg bg-amber-50 border-amber-200">
                  <p className="text-sm text-amber-800">
                    A payment for this order is still being confirmed. Please check its status before paying again.
                  </p>
                  <Link
                    href={`/checkout/confirmation/${activeOrderCode}`}
                    className="mt-2 inline-block text-sm font-medium text-brand-dark-blue underline underline-offset-2"
                  >
                    Check order status
                  </Link>
                </div>
              )}
              {resumeRejection && currentStep === CheckoutStep.CUSTOMER_INFO && (
                <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">Your Affirm payment was not completed.</p>
                  <p className="text-red-600 text-sm mt-1">{resumeRejection}</p>
                </div>
              )}
              {otherPendingAffirmOrder && (
                <div role="status" className="mb-6 p-4 border rounded-lg bg-amber-50 border-amber-200">
                  <p className="text-sm text-amber-800">
                    We&apos;re still confirming your Affirm payment for order {otherPendingAffirmOrder}. Please
                    check its status before paying again.
                  </p>
                  <Link
                    href={`/checkout/confirmation/${otherPendingAffirmOrder}`}
                    className="mt-2 inline-block text-sm font-medium text-brand-dark-blue underline underline-offset-2"
                  >
                    Check order status
                  </Link>
                </div>
              )}
              {/* On the payment step the payment method selector shows this notice itself */}
              {paymentElsewhere && currentStep === CheckoutStep.CUSTOMER_INFO && (
                <PaymentInOtherTabNotice className="mb-6" />
              )}

              {/* Notice if Affirm ever redirects here instead of calling the modal callbacks (?affirm=cancelled) */}
              <Suspense fallback={null}>
                <AffirmReturnNotice />
              </Suspense>

              {currentStep === CheckoutStep.CUSTOMER_INFO ? (
                /* Customer Information Form */
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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
                    loadFailed={shippingMethodsLoadFailed}
                    isRetrying={isFetchingShippingMethods}
                    onRetry={() => void refetchShippingMethods()}
                    onShippingMethodSelect={setChosenShippingMethod}
                  />

                  {continueBlocked && (
                    <p id="checkout-continue-hint" className="text-sm text-center text-brand-dark-blue/70">
                      You can continue once the payment in progress for this order ends.
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isSubmitting || isProcessing || continueBlocked || noShippingMethod}
                    aria-describedby={
                      [continueBlocked && 'checkout-continue-hint', noShippingMethod && NO_SHIPPING_METHOD_ID]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
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
                /* Payment Step: card (Stripe) and/or Affirm, depending on what the order can use */
                orderCode ? (
                  <PaymentMethodSelector
                    clientSecret={clientSecret}
                    orderCode={orderCode}
                    paymentMethods={paymentMethods}
                    orderTotal={cartOrder?.totalWithTax}
                    onPaid={handlePaid}
                    onBack={handleBack}
                    onPaymentStart={handlePaymentStart}
                  />
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
