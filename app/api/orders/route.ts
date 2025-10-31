import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_CUSTOMER_ORDERS } from '@/lib/graphql/queries';
import { UserOrder, OrderProduct } from '@/app/profile/types';

// Force dynamic rendering for session-based auth
export const dynamic = 'force-dynamic';

/**
 * Map Vendure order state to frontend status
 */
function mapOrderState(state: string): UserOrder['status'] {
  const stateMap: Record<string, UserOrder['status']> = {
    'AddingItems': 'pending',
    'ArrangingPayment': 'pending',
    'PaymentAuthorized': 'pending',
    'PaymentSettled': 'on-the-way',
    'PartiallyShipped': 'on-the-way',
    'Shipped': 'shipped',
    'PartiallyDelivered': 'on-the-way',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled',
  };
  return stateMap[state] || 'pending';
}

/**
 * Calculate estimated delivery date
 * Typically 3-7 business days after order is placed
 */
function calculateDeliveryDate(orderDate: string, orderState: string): string | undefined {
  if (!orderDate) return undefined;
  
  const date = new Date(orderDate);
  
  // If already shipped/delivered, estimate based on state
  if (orderState === 'Delivered') {
    return date.toISOString();
  }
  
  // Estimate 5-7 business days for processing and shipping
  const estimatedDays = orderState === 'Shipped' || orderState === 'PartiallyShipped' ? 2 : 7;
  date.setDate(date.getDate() + estimatedDays);
  
  return date.toISOString();
}

/**
 * Transform Vendure order lines to frontend product format
 */
function transformOrderProducts(lines: any[]): OrderProduct[] {
  return (lines || []).map((line) => {
    const productVariant = line.productVariant || {};
    const product = productVariant.product || {};
    const asset = line.featuredAsset || productVariant.featuredAsset || product.featuredAsset;
    
    // Extract custom fields (color, size, etc.)
    const customFields = line.customFields || {};
    
    return {
      id: line.id,
      name: product.name || productVariant.name || 'Unknown Product',
      featuredAsset: asset ? { preview: asset.preview || asset.source } : undefined,
      quantity: line.quantity,
      unitPrice: line.discountedUnitPriceWithTax || line.unitPriceWithTax || 0,
      totalPrice: line.linePriceWithTax || 0,
      color: customFields.color || 'Silver',
      size: customFields.size || 'Large',
    };
  });
}

/**
 * Format shipping address as a single string
 */
function formatDeliveryAddress(shippingAddress: any): string {
  if (!shippingAddress) return 'Address not available';
  
  const parts = [
    shippingAddress.streetLine1,
    shippingAddress.streetLine2,
    shippingAddress.city ? `${shippingAddress.city}` : null,
    shippingAddress.province,
    shippingAddress.postalCode,
    shippingAddress.countryCode,
  ].filter(Boolean);
  
  return parts.join(', ') || 'Address not available';
}

/**
 * Transform Vendure order to frontend UserOrder format
 */
function transformOrder(order: any): UserOrder {
  const products = transformOrderProducts(order.lines || []);
  const productCount = products.reduce((sum, p) => sum + p.quantity, 0);
  
  const deliveryDate = calculateDeliveryDate(
    order.orderPlacedAt || order.createdAt,
    order.state
  );
  
  return {
    id: order.id,
    orderNumber: order.code,
    timestamp: order.orderPlacedAt || order.createdAt,
    status: mapOrderState(order.state),
    deliveryDate,
    deliveryAddress: formatDeliveryAddress(order.shippingAddress),
    currency: order.currencyCode || 'USD',
    totalAmount: order.totalWithTax || 0,
    productCount,
    products,
  };
}

/**
 * Build OrderListOptions from query parameters
 */
function buildOrderOptions(
  status?: string | null,
  limit?: string | null,
  page?: string | null
): any {
  const take = Math.min(parseInt(limit || '10', 10), 100); // Max 100 items
  const currentPage = Math.max(parseInt(page || '1', 10), 1);
  const skip = (currentPage - 1) * take;
  
  const options: any = {
    take,
    skip,
    sort: { createdAt: 'DESC' }, // Most recent first
  };
  
  // Apply status filters
  if (status === 'current') {
    // Active orders (not delivered or cancelled)
    options.filter = {
      active: { eq: true },
      state: { 
        notIn: ['Delivered', 'Cancelled'] 
      },
    };
  } else if (status === 'unpaid') {
    // Orders awaiting payment
    options.filter = {
      state: { 
        in: ['ArrangingPayment', 'PaymentAuthorized'] 
      },
    };
  } else if (status && status !== 'all') {
    // Specific state filter
    options.filter = {
      state: { eq: status },
    };
  }
  
  return { options, currentPage, take };
}

/**
 * GET /api/orders
 * 
 * Query parameters:
 * - status: Filter by status ('current', 'unpaid', 'all', or specific Vendure state)
 * - limit: Number of orders per page (default: 10, max: 100)
 * - page: Page number (default: 1)
 * 
 * Returns paginated orders for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const page = searchParams.get('page');
    
    // Build order options with pagination
    const { options, currentPage, take } = buildOrderOptions(status, limit, page);
    
    // Fetch orders from Vendure
    const result = await fetchGraphQL(
      {
        query: GET_CUSTOMER_ORDERS,
        variables: { options },
      },
      { req }
    );
    
    // Handle errors
    if (result.errors) {
      const isUnauthorized = result.errors.some(
        (e) =>
          e.extensions?.code === 'FORBIDDEN' ||
          e.message?.includes('not currently authorized')
      );
      
      if (isUnauthorized) {
        return NextResponse.json(
          {
            error: 'Authentication required',
            message: 'You must be logged in to view your orders',
            code: 'UNAUTHORIZED',
            orders: [],
            pagination: {
              totalItems: 0,
              currentPage: 1,
              totalPages: 0,
              hasNextPage: false,
            },
          },
          { status: 401 }
        );
      }
      
      console.error('GraphQL errors fetching orders:', result.errors);
      return NextResponse.json(
        {
          error: 'Failed to fetch orders',
          message: result.errors[0]?.message || 'Unknown error occurred',
          code: 'ORDERS_FETCH_ERROR',
          details: result.errors,
          orders: [],
          pagination: {
            totalItems: 0,
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
          },
        },
        { status: 500 }
      );
    }
    
    // Extract customer and orders
    const customer = result.data?.activeCustomer;
    
    if (!customer) {
      return NextResponse.json({
        orders: [],
        pagination: {
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          hasNextPage: false,
        },
      });
    }
    
    const ordersData = customer.orders || {};
    const totalItems = ordersData.totalItems || 0;
    const orders: UserOrder[] = (ordersData.items || []).map(transformOrder);
    
    // Calculate pagination
    const totalPages = Math.ceil(totalItems / take);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;
    
    // Build response
    const response = NextResponse.json({
      orders,
      pagination: {
        totalItems,
        currentPage,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        limit: take,
      },
    });
    
    // Forward session cookies if present
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching orders:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'ORDERS_FETCH_ERROR',
        orders: [],
        pagination: {
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          hasNextPage: false,
        },
      },
      { status: 500 }
    );
  }
}

