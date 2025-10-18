# 🛒 Checkout Flow - Technical Documentation

## Overview

This document provides comprehensive technical documentation for the checkout and payment system implemented with **Next.js**, **Vendure**, and **Stripe**.

## Table of Contents

- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Data Flow](#data-flow)
- [Step-by-Step Implementation](#step-by-step-implementation)
- [API Reference](#api-reference)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)

## Architecture

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Forms**: React Hook Form + Zod validation
- **Backend**: Vendure (GraphQL Shop API)
- **Payment**: Stripe Payment Intents + Payment Element
- **State**: React Context (Cart), URL state (Checkout steps)

### Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Journey                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Shopping    2. Cart       3. Checkout      4. Payment       │
│     ↓              ↓              ↓                ↓             │
│  Browse → Add → Review → Customer Info → Payment → Confirm     │
│  Products  Items  Cart    + Shipping      Details   Order      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Technical Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend          API Routes         Vendure         Stripe    │
│     │                  │                 │               │       │
│     ├──Load Cart──────>│                 │               │       │
│     │                  ├──GET Order─────>│               │       │
│     │<─────────────────┤<────Order───────┤               │       │
│     │                  │                 │               │       │
│     ├──Set Customer───>│                 │               │       │
│     │                  ├──Mutation──────>│               │       │
│     │<─────────────────┤<────Success─────┤               │       │
│     │                  │                 │               │       │
│     ├──Set Address────>│                 │               │       │
│     │                  ├──Mutation──────>│               │       │
│     │<─────────────────┤<────Success─────┤               │       │
│     │                  │                 │               │       │
│     ├──Set Shipping───>│                 │               │       │
│     │                  ├──Mutation──────>│               │       │
│     │<─────────────────┤<────Success─────┤               │       │
│     │                  │                 │               │       │
│     ├──Create Intent──>│                 │               │       │
│     │                  ├──Mutation──────>│               │       │
│     │                  │                 ├──Create PI───>│       │
│     │                  │                 │<──Secret──────┤       │
│     │<────Secret───────┤<────Secret──────┤               │       │
│     │                  │                 │               │       │
│     ├──Confirm Pay─────────────────────────────────────>│       │
│     │                  │                 │               │       │
│     │                  │                 │<──Webhook─────┤       │
│     │                  │                 ├──Update Order │       │
│     │                  │                 ├──200 OK──────>│       │
│     │                  │                 │               │       │
│     │<─────Redirect────────────────────────────────────┘       │
│     │                  │                 │                      │
│     ├──Get Order──────>│                 │                      │
│     │                  ├──Query────────>│                      │
│     │<─────────────────┤<────Order───────┤                      │
│     │                  │                 │                      │
│  Display               │                 │                      │
│  Success               │                 │                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

### Created/Modified Files

```
app/
├── checkout/
│   ├── page.tsx                                    # Main checkout page with 3 steps
│   └── confirmation/
│       └── [orderCode]/
│           └── page.tsx                            # Order confirmation page
├── api/
│   ├── checkout/
│   │   ├── payment-intent/
│   │   │   └── route.ts                           # Create Stripe Payment Intent
│   │   ├── set-customer/
│   │   │   └── route.ts                           # Set customer information
│   │   ├── set-shipping-address/
│   │   │   └── route.ts                           # Set shipping address
│   │   ├── set-billing-address/
│   │   │   └── route.ts                           # Set billing address
│   │   ├── set-shipping-method/
│   │   │   └── route.ts                           # Set shipping method
│   │   └── shipping-methods/
│   │       └── route.ts                           # Get eligible shipping methods
│   └── orders/
│       └── [orderCode]/
│           └── route.ts                            # Get order by code

components/
└── checkout/
    └── order-summary.tsx                           # Reusable order summary component

lib/
└── graphql/
    ├── fragments.ts                                # Extended ORDER_FRAGMENT
    ├── mutations.ts                                # Added checkout mutations
    └── queries.ts                                  # Added checkout queries
```

## Data Flow

### 1. Cart to Checkout Transition

```typescript
// User navigates from /cart to /checkout
router.push('/checkout');

// Checkout page loads active order
const loadActiveOrder = async () => {
  const res = await fetch('/api/cart/active');
  const data = await res.json();
  setOrder(data.activeOrder);
  setOrderCode(data.activeOrder.code);
};
```

### 2. Customer Information Step

```typescript
// Form submission with validation
const onCustomerSubmit = async (data: CustomerFormData) => {
  // 1. Set customer
  await fetch('/api/checkout/set-customer', {
    method: 'POST',
    body: JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      emailAddress: data.email,
    }),
  });

  // 2. Set shipping address
  await fetch('/api/checkout/set-shipping-address', {
    method: 'POST',
    body: JSON.stringify({
      fullName: data.shippingFullName,
      streetLine1: data.shippingStreetLine1,
      // ... other fields
    }),
  });

  // 3. Set billing address (if different)
  if (!data.billingSameAsShipping) {
    await fetch('/api/checkout/set-billing-address', {
      method: 'POST',
      body: JSON.stringify({ /* billing address */ }),
    });
  }

  // 4. Set shipping method
  await fetch('/api/checkout/set-shipping-method', {
    method: 'POST',
    body: JSON.stringify({
      shippingMethodId: data.shippingMethodId,
    }),
  });

  // 5. Create Payment Intent
  await handleStartPayment();
};
```

### 3. Payment Intent Creation

```typescript
const handleStartPayment = async () => {
  // Request Payment Intent from Vendure via API route
  const resIntent = await fetch('/api/checkout/payment-intent', {
    method: 'POST',
    body: JSON.stringify({ orderCode }),
  });

  const data = await resIntent.json();
  setClientSecret(data.clientSecret);
  
  // Navigate to payment step
  goToStep('payment');
};
```

### 4. Payment Confirmation

```typescript
// User submits payment form
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const result = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: `${SITE_URL}/checkout/confirmation/${orderCode}`,
    },
  });

  // If error, display to user
  if (result.error) {
    setError(result.error.message);
  }
  // If success, Stripe redirects automatically
};
```

### 5. Webhook Processing (Vendure Side)

```
Stripe → POST /payments/stripe (Vendure)
  ├── Verify webhook signature
  ├── Process payment_intent.succeeded event
  ├── Update order payment state
  └── Send confirmation email (if configured)
```

### 6. Confirmation Page

```typescript
// Load order to display final state
const loadOrder = async () => {
  const res = await fetch(`/api/orders/${orderCode}`);
  const data = await res.json();
  setOrder(data.order);
  
  // Determine payment status from:
  // 1. Stripe redirect params (redirect_status)
  // 2. Order payment state
  const paymentStatus = getPaymentStatus();
  
  // Display success, pending, or failed state
};
```

## Step-by-Step Implementation

### Step 1: Environment Setup

1. **Create `.env.local` file:**
```bash
cp env.example .env.local
```

2. **Add Stripe keys:**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

3. **Configure Vendure:**
Ensure Vendure has StripePlugin configured:
```typescript
// vendure-config.ts
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';

export const config: VendureConfig = {
  plugins: [
    StripePlugin.init({
      storeCustomersInStripe: true,
    }),
  ],
};
```

### Step 2: Vendure Webhook Setup

1. **In Stripe Dashboard:**
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-vendure.com/payments/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

2. **For Local Development:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to http://localhost:3000/payments/stripe

# Copy webhook signing secret to Vendure config
```

### Step 3: Frontend Implementation

The checkout flow is already implemented in:
- `/app/checkout/page.tsx` - Main checkout page
- `/app/checkout/confirmation/[orderCode]/page.tsx` - Confirmation page
- `/components/checkout/order-summary.tsx` - Order summary component

### Step 4: Testing

1. **Start Vendure backend:**
```bash
cd vendure-backend
npm run dev
```

2. **Start Next.js frontend:**
```bash
cd florida-home-front
npm run dev
```

3. **Start Stripe webhook listener (separate terminal):**
```bash
stripe listen --forward-to http://localhost:3000/payments/stripe
```

4. **Test the flow:**
   - Add products to cart
   - Navigate to `/checkout`
   - Fill customer information
   - Select shipping method
   - Enter test card: `4242 4242 4242 4242`
   - Complete payment
   - Verify confirmation page

## API Reference

### POST `/api/checkout/set-customer`

Set customer information for the active order.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com"
}
```

**Response:**
```json
{
  "order": { /* Order object */ }
}
```

### POST `/api/checkout/set-shipping-address`

Set shipping address for the active order.

**Request:**
```json
{
  "fullName": "John Doe",
  "streetLine1": "123 Main St",
  "streetLine2": "Apt 4B",
  "city": "Miami",
  "province": "FL",
  "postalCode": "33101",
  "countryCode": "US",
  "phoneNumber": "+1 555-123-4567"
}
```

**Response:**
```json
{
  "order": { /* Order object */ }
}
```

### POST `/api/checkout/set-billing-address`

Set billing address for the active order.

**Request:** Same as shipping address

**Response:**
```json
{
  "order": { /* Order object */ }
}
```

### GET `/api/checkout/shipping-methods`

Get eligible shipping methods for the active order.

**Response:**
```json
{
  "shippingMethods": [
    {
      "id": "1",
      "code": "standard-shipping",
      "name": "Standard Shipping",
      "description": "5-7 business days",
      "priceWithTax": 995
    }
  ]
}
```

### POST `/api/checkout/set-shipping-method`

Set shipping method for the active order.

**Request:**
```json
{
  "shippingMethodId": "1"
}
```

**Response:**
```json
{
  "order": { /* Order object with shipping */ }
}
```

### POST `/api/checkout/payment-intent`

Create a Stripe Payment Intent for the order.

**Request:**
```json
{
  "orderCode": "ABC123XYZ"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_yyy"
}
```

### GET `/api/orders/[orderCode]`

Get order details by order code.

**Response:**
```json
{
  "order": {
    "id": "1",
    "code": "ABC123XYZ",
    "state": "PaymentSettled",
    "total": 49900,
    "totalWithTax": 54890,
    "customer": { /* customer info */ },
    "shippingAddress": { /* address */ },
    "payments": [
      {
        "state": "Settled",
        "amount": 54890
      }
    ]
  }
}
```

## Testing Guide

### Test Cards (Stripe Test Mode)

| Card Number | Description | Expected Result |
|-------------|-------------|-----------------|
| 4242 4242 4242 4242 | Successful payment | Payment succeeds immediately |
| 4000 0025 0000 3155 | 3DS authentication | Requires 3DS authentication |
| 4000 0000 0000 9995 | Declined card | Card declined error |
| 4000 0000 0000 9987 | Insufficient funds | Insufficient funds error |

**Expiry:** Any future date (e.g., 12/25)  
**CVC:** Any 3 digits (e.g., 123)  
**ZIP:** Any 5 digits (e.g., 12345)

### Testing Workflow

1. **Test Successful Payment:**
   - Add product to cart
   - Proceed to checkout
   - Fill all required information
   - Use card: 4242 4242 4242 4242
   - Verify success message
   - Check Stripe Dashboard for payment

2. **Test 3DS Authentication:**
   - Use card: 4000 0025 0000 3155
   - Complete 3DS challenge
   - Verify redirect back to site
   - Check payment status

3. **Test Card Decline:**
   - Use card: 4000 0000 0000 9995
   - Verify error message displays
   - Verify user can retry

4. **Test Webhook:**
   - Ensure Stripe CLI is running
   - Complete a payment
   - Check CLI output for webhook events
   - Verify order state in Vendure Admin

## Troubleshooting

### Common Issues

#### 1. Payment Intent Creation Fails

**Error:** `Failed to create payment intent`

**Solutions:**
- Verify Vendure has StripePlugin configured
- Check Stripe secret key in Vendure config
- Ensure order has customer, address, and shipping method set
- Check Vendure logs for detailed error

#### 2. Webhook Not Received

**Error:** Order state not updating after payment

**Solutions:**
- Verify webhook endpoint is accessible (not localhost for production)
- Check webhook signing secret is correct in Vendure
- Use Stripe CLI for local testing
- Check Stripe Dashboard → Webhooks for failed deliveries
- Verify webhook events are enabled

#### 3. Redirect After Payment Fails

**Error:** User not redirected to confirmation page

**Solutions:**
- Verify `return_url` is correct
- Check `NEXT_PUBLIC_SITE_URL` environment variable
- Ensure confirmation page route exists
- Check browser console for errors

#### 4. Order Not Found on Confirmation Page

**Error:** `Order not found`

**Solutions:**
- Verify order code is correct in URL
- Check order still exists in Vendure
- Verify API route is working
- Check cookies are being passed correctly

### Debugging Tips

1. **Enable Verbose Logging:**
```typescript
// In API routes
console.log('Request:', await req.json());
console.log('Response:', response);
```

2. **Check Network Tab:**
   - Open browser DevTools
   - Go to Network tab
   - Filter by Fetch/XHR
   - Check request/response for each API call

3. **Stripe Dashboard:**
   - Go to Developers → Logs
   - View payment attempts
   - Check webhook deliveries

4. **Vendure Admin:**
   - Check order state
   - View payment history
   - Check order modifications log

### Environment-Specific Issues

#### Development

- Ensure Stripe CLI is running for webhooks
- Use test mode keys
- Check CORS settings in middleware

#### Production

- Use production Stripe keys
- Ensure webhook endpoint is publicly accessible
- Verify HTTPS is enabled
- Check environment variables in deployment platform

## Security Checklist

- [ ] Stripe secret key is only in server-side code
- [ ] Webhook signature verification is enabled
- [ ] HTTPS is enabled in production
- [ ] No sensitive data in client-side logs
- [ ] Rate limiting on API routes
- [ ] CORS properly configured
- [ ] Environment variables not committed to git
- [ ] Payment Element used for card data (PCI compliant)

## Performance Optimization

1. **Lazy Load Stripe:**
   - Stripe.js only loads on payment step
   - Reduces initial bundle size

2. **Server Components:**
   - Confirmation page uses server components
   - Order data fetched server-side

3. **Optimistic Updates:**
   - Form submits show loading state
   - UI updates before server response

4. **Image Optimization:**
   - Product images use Next.js Image
   - Lazy loading enabled

## Additional Resources

- [Stripe Payment Element Documentation](https://stripe.com/docs/payments/payment-element)
- [Vendure StripePlugin Documentation](https://docs.vendure.io/reference/core-plugins/payments-plugin/stripe-plugin)
- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Last Updated:** October 2025  
**Version:** 1.0.0

