import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_CUSTOMER_ORDERS } from '@/lib/graphql/queries';
import { UserOrder, OrderProduct } from '@/app/profile/types';

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

// GET - Fetch user orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build options based on status filter
    const options: any = {
      take: 50,
      skip: 0,
    };

    if (status === 'current') {
      // Get active orders (not delivered or cancelled)
      options.filter = {
        active: { eq: true },
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
    const orders: UserOrder[] = customer.orders.items.map((order: any) => {
      const products: OrderProduct[] = (order.lines || []).map((line: any) => ({
        id: line.id,
        name: line.productVariant?.name || 'Unknown Product',
        featuredAsset: line.productVariant?.featuredAsset || undefined,
        quantity: line.quantity,
        unitPrice: line.unitPriceWithTax / line.quantity,
        totalPrice: line.linePriceWithTax,
        color: undefined, // These would come from custom fields if available
        size: undefined,
      }));

      const deliveryAddress = order.shippingAddress
        ? [
            order.shippingAddress.streetLine1,
            order.shippingAddress.streetLine2,
            `${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode}`,
            order.shippingAddress.countryCode,
          ]
            .filter(Boolean)
            .join(', ')
        : 'Address not available';

      // Calculate delivery date (typically 5-7 business days after order placed)
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
        totalAmount: order.totalWithTax,
        productCount: products.reduce((sum, p) => sum + p.quantity, 0),
        products,
      };
    });

    const response = NextResponse.json({ orders });
    
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

