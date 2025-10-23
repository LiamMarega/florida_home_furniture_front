'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Package, Truck, User } from 'lucide-react';

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

export default function CheckoutPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: 'US',
    },
  });

  const billingSameAsShipping = watch('billingSameAsShipping');

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement checkout logic
      console.log('Form data:', data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h1 className="text-3xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
                <User className="inline-block w-8 h-8 mr-2 mb-1" />
                Customer Information
              </h1>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                  <div className="text-center py-4">
                    <p className="text-brand-dark-blue/70 mb-4">Shipping methods will be loaded here</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold"
                  disabled={isSubmitting}
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
