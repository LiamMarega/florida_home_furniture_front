'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Package, Truck, User, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Stripe
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

// ⚠️ Clave publicable
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ----------------- Zod schema -----------------
const customerSchema = z.object({
  emailAddress: z.string().email('Invalid email address'),
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

  shippingMethodId: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// ----------------- Helpers -----------------
async function setShippingMethod(shippingMethodId: string) {
  const res = await fetch('/api/checkout/shipping-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shippingMethodIds: [shippingMethodId] }),
  });
  return res.json();
}

// ----------------- Payment step (Step 2) -----------------
function PaymentStep({
  clientSecret,
  onPaid,
  onBack,
}: {
  clientSecret: string;
  onPaid: (orderCode: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    try {
      // Valida inputs del Payment Element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment validation failed');
        setPaying(false);
        return;
      }

      // Confirmar PaymentIntent con Payment Element
      // https://docs.stripe.com/js/payment_intents/confirm_payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setPaying(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        // Registrar pago en Vendure -> addPaymentToOrder (PaymentInput)
        const completeRes = await fetch('/api/checkout/payment-intent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const complete = await completeRes.json();

        if (complete.result?.__typename === 'Order') {
          onPaid(complete.result.code);
          return;
        }
        setError(complete.errors?.[0]?.message || 'Failed to complete order');
      } else {
        setError(`Unexpected intent status: ${paymentIntent?.status ?? 'unknown'}`);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Payment error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handlePay} disabled={!stripe || !elements || paying}>
          {paying ? 'Processing...' : 'Pay now'}
          <CreditCard className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ----------------- Main Page -----------------
export default function CheckoutPage() {
  const router = useRouter();

  // shipping methods
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');
  const [isLoadingShippingMethods, setIsLoadingShippingMethods] = useState(false);

  // Step control (si hay clientSecret -> paso de pago)
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

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

  const billingSameAsShipping = watch('billingSameAsShipping');

  // Elegibles de shipping
  const fetchShippingMethods = useCallback(async () => {
    setIsLoadingShippingMethods(true);
    try {
      const response = await fetch('/api/checkout/shipping-methods', {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.eligibleShippingMethods?.length) {
        setShippingMethods(data.eligibleShippingMethods);
        const first = data.eligibleShippingMethods[0];
        setSelectedShippingMethod(first.id);
        setValue('shippingMethodId', first.id);
      }
    } catch (e) {
      console.error('Error fetching shipping methods:', e);
    } finally {
      setIsLoadingShippingMethods(false);
    }
  }, [setValue]);

  useEffect(() => {
    fetchShippingMethods();
  }, [fetchShippingMethods]);

  // ---------- Paso 1: datos + crear PaymentIntent ----------
  const onSubmit = async (data: CustomerFormData) => {
    try {
      // (1) Guest/logged-in safe
      await fetch('/api/checkout/set-customer', {
        method: 'POST',
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          emailAddress: data.emailAddress,
          phoneNumber: data.shippingPhoneNumber,
        }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // (2) Direcciones -> tu API normaliza flat -> CreateAddressInput
      await fetch('/api/checkout/set-shipping-address', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // (3) Método de envío
      if (selectedShippingMethod) {
        await setShippingMethod(selectedShippingMethod);
      }

      // (4) Crear/reusar PaymentIntent (mueve a ArrangingPayment)
      // Vendure recomienda ArrangingPayment antes de addPaymentToOrder. :contentReference[oaicite:2]{index=2}
      const piRes = await fetch('/api/checkout/payment-intent', {
        method: 'POST',
        credentials: 'include',
      });
      const pi = await piRes.json();
      if (!pi?.clientSecret || !pi?.paymentIntentId) {
        throw new Error('Failed to create Payment Intent');
      }
      setClientSecret(pi.clientSecret);
      setPaymentIntentId(pi.paymentIntentId);
    } catch (error) {
      console.error('Checkout error:', error);
      // TODO: toast UI
    }
  };

  const handlePaid = (orderCode: string) => {
    router.push(`/checkout/confirmation/${orderCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h1 className="text-3xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
                <User className="inline-block w-8 h-8 mr-2 mb-1" />
                {clientSecret ? 'Payment' : 'Customer Information'}
              </h1>

              {!clientSecret ? (
                // --------- STEP 1: FORM DATA ---------
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-brand-dark-blue">Contact Information</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input id="firstName" {...register('firstName')} className={errors.firstName ? 'border-red-500' : ''} />
                        {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input id="lastName" {...register('lastName')} className={errors.lastName ? 'border-red-500' : ''} />
                        {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="emailAddress">Email Address *</Label>
                      <Input id="emailAddress" type="email" {...register('emailAddress')} placeholder="you@example.com" className={errors.emailAddress ? 'border-red-500' : ''} />
                      {errors.emailAddress && <p className="text-red-500 text-sm mt-1">{errors.emailAddress.message}</p>}
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
                      <Input id="shippingFullName" {...register('shippingFullName')} className={errors.shippingFullName ? 'border-red-500' : ''} />
                      {errors.shippingFullName && <p className="text-red-500 text-sm mt-1">{errors.shippingFullName.message}</p>}
                    </div>

                    <div>
                      <Label htmlFor="shippingStreetLine1">Street Address *</Label>
                      <Input id="shippingStreetLine1" {...register('shippingStreetLine1')} placeholder="123 Main St" className={errors.shippingStreetLine1 ? 'border-red-500' : ''} />
                      {errors.shippingStreetLine1 && <p className="text-red-500 text-sm mt-1">{errors.shippingStreetLine1.message}</p>}
                    </div>

                    <div>
                      <Label htmlFor="shippingStreetLine2">Apartment, suite, etc. (optional)</Label>
                      <Input id="shippingStreetLine2" {...register('shippingStreetLine2')} placeholder="Apt 4B" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="shippingCity">City *</Label>
                        <Input id="shippingCity" {...register('shippingCity')} className={errors.shippingCity ? 'border-red-500' : ''} />
                        {errors.shippingCity && <p className="text-red-500 text-sm mt-1">{errors.shippingCity.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="shippingProvince">State / Province *</Label>
                        <Input id="shippingProvince" {...register('shippingProvince')} placeholder="FL" className={errors.shippingProvince ? 'border-red-500' : ''} />
                        {errors.shippingProvince && <p className="text-red-500 text-sm mt-1">{errors.shippingProvince.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="shippingPostalCode">Postal Code *</Label>
                        <Input id="shippingPostalCode" {...register('shippingPostalCode')} placeholder="33101" className={errors.shippingPostalCode ? 'border-red-500' : ''} />
                        {errors.shippingPostalCode && <p className="text-red-500 text-sm mt-1">{errors.shippingPostalCode.message}</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="shippingPhoneNumber">Phone Number *</Label>
                      <Input id="shippingPhoneNumber" {...register('shippingPhoneNumber')} type="tel" placeholder="+1 (555) 123-4567" className={errors.shippingPhoneNumber ? 'border-red-500' : ''} />
                      {errors.shippingPhoneNumber && <p className="text-red-500 text-sm mt-1">{errors.shippingPhoneNumber.message}</p>}
                    </div>
                  </div>

                  <Separator />

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="billingSameAsShipping" {...register('billingSameAsShipping')} className="w-4 h-4 text-brand-primary focus:ring-brand-primary border-brand-cream rounded" />
                      <Label htmlFor="billingSameAsShipping" className="font-medium cursor-pointer">Billing address same as shipping</Label>
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

                    {isLoadingShippingMethods ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary mx-auto mb-2"></div>
                        <p className="text-brand-dark-blue/70">Loading shipping methods...</p>
                      </div>
                    ) : shippingMethods.length > 0 ? (
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <div
                            key={method.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              selectedShippingMethod === method.id
                                ? 'border-brand-primary bg-brand-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              setSelectedShippingMethod(method.id);
                              setValue('shippingMethodId', method.id);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="shippingMethod"
                                  value={method.id}
                                  checked={selectedShippingMethod === method.id}
                                  onChange={() => {
                                    setSelectedShippingMethod(method.id);
                                    setValue('shippingMethodId', method.id);
                                  }}
                                  className="w-4 h-4 text-brand-primary focus:ring-brand-primary border-gray-300"
                                />
                                <div>
                                  <p className="font-medium text-brand-dark-blue">
                                    {method.description || 'Standard Shipping'}
                                  </p>
                                  {method.metadata && (
                                    <p className="text-sm text-brand-dark-blue/70">
                                      {method.metadata.deliveryTime || 'Estimated delivery time'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-brand-dark-blue">
                                  ${(method.priceWithTax / 100).toFixed(2)}
                                </p>
                                {method.price !== method.priceWithTax && (
                                  <p className="text-sm text-brand-dark-blue/70">(incl. tax)</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-brand-dark-blue/70 mb-4">
                          Shipping methods will be available after entering your address
                        </p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isSubmitting}>
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
              ) : (
                // --------- STEP 2: PAYMENT ELEMENT ---------
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentStep
                    clientSecret={clientSecret}
                    onPaid={handlePaid}
                    onBack={() => {
                      setClientSecret(null);
                      setPaymentIntentId(null);
                    }}
                  />
                </Elements>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Order Summary</h3>
              <p className="text-brand-dark-blue/70">Order summary will be displayed here</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
