# React Query Migration Guide

This document explains how React Query (TanStack Query) has been integrated into the Florida Home Furniture application to replace manual fetch calls.

## What was changed

### 1. Installation and Setup
- Replaced `react-query` v3 with `@tanstack/react-query` v5
- Added `@tanstack/react-query-devtools` for development
- Created `QueryProvider` component in `lib/query-client.tsx`
- Wrapped the app with `QueryProvider` in `app/layout.tsx`

### 2. Custom Hooks Created

#### Cart Operations (`hooks/use-cart.ts`)
- `useActiveCart()` - Fetches the active cart/order
- `useAddToCart()` - Adds items to cart
- `useRemoveFromCart()` - Removes items from cart
- `useUpdateCartQuantity()` - Updates item quantities
- `useClearCart()` - Clears the entire cart

#### Checkout Operations (`hooks/use-checkout.ts`)
- `useShippingMethods()` - Fetches available shipping methods
- `useSetCustomer()` - Sets customer information
- `useSetShippingAddress()` - Sets shipping address
- `useSetBillingAddress()` - Sets billing address
- `useSetShippingMethod()` - Sets shipping method
- `useCreatePaymentIntent()` - Creates Stripe payment intent

### 3. Updated Components

#### Cart Context (`contexts/cart-context.tsx`)
- Replaced manual state management with React Query hooks
- Maintains the same API for backward compatibility
- Automatic cache invalidation and refetching

#### Checkout Page (`app/checkout/page.tsx`)
- Replaced all fetch calls with React Query mutations
- Improved error handling and loading states
- Better user experience with automatic retries

## Benefits of React Query

### 1. Automatic Caching
- API responses are cached automatically
- Reduces unnecessary network requests
- Improves performance and user experience

### 2. Background Refetching
- Data stays fresh with automatic background updates
- Configurable stale time (currently 1 minute for queries)

### 3. Error Handling
- Built-in retry logic with exponential backoff
- Automatic error states and recovery
- Better user feedback

### 4. Loading States
- Automatic loading states for all operations
- Optimistic updates for better UX
- Skeleton loading and error boundaries

### 5. DevTools
- React Query DevTools for debugging
- Query inspection and cache management
- Performance monitoring

## Usage Examples

### Using Cart Hooks
```tsx
import { useActiveCart, useAddToCart } from '@/hooks/use-cart';

function ProductCard({ product }) {
  const { data: cartData, isLoading } = useActiveCart();
  const addToCartMutation = useAddToCart();

  const handleAddToCart = async () => {
    try {
      await addToCartMutation.mutateAsync({
        productVariantId: product.variantId,
        quantity: 1
      });
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <button 
      onClick={handleAddToCart}
      disabled={addToCartMutation.isPending}
    >
      {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### Using Checkout Hooks
```tsx
import { useShippingMethods, useSetCustomer } from '@/hooks/use-checkout';

function CheckoutForm() {
  const { data: shippingData, isLoading } = useShippingMethods();
  const setCustomerMutation = useSetCustomer();

  const handleSubmit = async (formData) => {
    try {
      await setCustomerMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        emailAddress: formData.email,
        forceGuest: true
      });
      // Continue with next step...
    } catch (error) {
      toast.error('Failed to set customer information');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button 
        type="submit" 
        disabled={setCustomerMutation.isPending}
      >
        {setCustomerMutation.isPending ? 'Processing...' : 'Continue'}
      </button>
    </form>
  );
}
```

## Configuration

### Query Client Settings
- **Stale Time**: 1 minute for queries
- **Retry Logic**: 
  - Queries: Up to 3 retries (no retry on 4xx errors)
  - Mutations: Up to 2 retries (no retry on 4xx errors)
- **DevTools**: Enabled in development mode

### Cache Keys
- Cart: `['cart', 'active']`
- Shipping Methods: `['checkout', 'shipping-methods']`
- Payment Intent: `['checkout', 'payment-intent', orderCode]`

## Migration Notes

1. **Backward Compatibility**: The cart context maintains the same API, so existing components don't need changes
2. **Error Handling**: All mutations now have proper error handling with toast notifications
3. **Loading States**: Components automatically get loading states from React Query
4. **Cache Invalidation**: Cart data is automatically invalidated when mutations succeed
5. **Performance**: Reduced API calls through intelligent caching

## Next Steps

1. Consider adding optimistic updates for cart operations
2. Implement offline support with React Query's offline capabilities
3. Add more granular error boundaries
4. Consider implementing infinite queries for product listings
5. Add query prefetching for better performance

## Troubleshooting

### Common Issues
1. **Stale Data**: Use `refetch()` or `invalidateQueries()` to refresh data
2. **Loading States**: Check `isLoading`, `isPending`, and `isFetching` states
3. **Error States**: Use `error` property from hooks for error handling
4. **Cache Issues**: Use React Query DevTools to inspect cache state

### DevTools
Access React Query DevTools in development mode to:
- Inspect query cache
- Monitor network requests
- Debug query states
- Test cache invalidation
