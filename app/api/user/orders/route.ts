import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_CUSTOMER_ORDERS } from '@/lib/graphql/queries';
import { UserOrder, OrderProduct } from '@/app/profile/types';

// Force dynamic rendering for session-based auth
export const dynamic = 'force-dynamic';

// Map Vendure order state to our status
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

// Transform order products
function transformOrderProducts(lines: any[]): OrderProduct[] {
  return (lines || []).map((line) => {
    const productVariant = line.productVariant || {};
    const product = productVariant.product || {};
    const asset = line.featuredAsset || productVariant.featuredAsset || product.featuredAsset;
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

// GET - Fetch user orders (legacy endpoint, redirects logic to /api/orders)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';
    const page = searchParams.get('page') || '1';

    // Build options based on status filter
    const take = Math.min(parseInt(limit, 10), 100);
    const currentPage = Math.max(parseInt(page, 10), 1);
    const skip = (currentPage - 1) * take;

    const options: any = {
      take,
      skip,
      sort: { createdAt: 'DESC' },
    };

    if (status === 'current') {
      // Get active orders (not delivered or cancelled)
      options.filter = {
        active: { eq: true },
        state: { notIn: ['Delivered', 'Cancelled'] },
      };
    } else if (status === 'unpaid') {
      // Get orders in payment states
      options.filter = {
        state: { in: ['ArrangingPayment', 'PaymentAuthorized'] },
      };
    }
    // 'all' doesn't need additional filters

    const result = await fetchGraphQL(
      {
        query: GET_CUSTOMER_ORDERS,
        variables: { options },
      },
      { req }
    );

    if (result.errors) {
      const isUnauthorized = result.errors.some(
        (e) => e.extensions?.code === 'FORBIDDEN' || e.message?.includes('not currently authorized')
      );

      if (isUnauthorized) {
        return NextResponse.json(
          { error: 'Authentication required', orders: [] },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch orders', details: result.errors },
        { status: 500 }
      );
    }

    const customer = result.data?.activeCustomer;
    
    if (!customer || !customer.orders?.items) {
      return NextResponse.json({ orders: [] });
    }

    // Transform Vendure orders to UserOrder format
    const ordersData = customer.orders;
    const totalItems = ordersData.totalItems || 0;
    
    const orders: UserOrder[] = (ordersData.items || []).map((order: any) => {
      const products = transformOrderProducts(order.lines || []);
      const productCount = products.reduce((sum, p) => sum + p.quantity, 0);

      const deliveryAddress = order.shippingAddress
        ? [
            order.shippingAddress.streetLine1,
            order.shippingAddress.streetLine2,
            order.shippingAddress.city,
            order.shippingAddress.province,
            order.shippingAddress.postalCode,
            order.shippingAddress.countryCode,
          ]
            .filter(Boolean)
            .join(', ')
        : 'Address not available';

      // Calculate delivery date
      const orderDate = order.orderPlacedAt || order.createdAt;
      const deliveryDate = orderDate
        ? new Date(new Date(orderDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      return {
        id: order.id,
        orderNumber: order.code,
        timestamp: order.orderPlacedAt || order.createdAt,
        status: mapOrderState(order.state),
        deliveryDate,
        deliveryAddress,
        currency: order.currencyCode || 'USD',
        totalAmount: order.totalWithTax || 0,
        productCount,
        products,
      };
    });

    const response = NextResponse.json({ 
      orders,
      pagination: {
        totalItems,
        currentPage,
        totalPages: Math.ceil(totalItems / take),
        hasNextPage: currentPage < Math.ceil(totalItems / take),
      },
    });
    
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

