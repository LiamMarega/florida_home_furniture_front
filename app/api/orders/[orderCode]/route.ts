import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ORDER_BY_CODE, GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderCode: string } }
) {
  const { orderCode } = params;

  if (!orderCode) {
    return NextResponse.json(
      { error: 'Order code is required' },
      { status: 400 }
    );
  }

  try {
    console.log('📦 Fetching order:', orderCode);

    // First, try to get the activeOrder (works if order is still in session)
    console.log('🔍 Trying activeOrder first...');
    const activeOrderResponse = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, {
      req // Pass the request to include cookies
    });

    // Check if activeOrder exists and matches the requested code
    if (activeOrderResponse.data?.activeOrder && 
        activeOrderResponse.data.activeOrder.code === orderCode) {
      console.log('✅ Found order via activeOrder');
      
      const nextResponse = NextResponse.json({ order: activeOrderResponse.data.activeOrder });
      
      if (activeOrderResponse.setCookies && activeOrderResponse.setCookies.length > 0) {
        activeOrderResponse.setCookies.forEach(cookie => {
          nextResponse.headers.append('Set-Cookie', cookie);
        });
      }
      
      return nextResponse;
    }

    console.log('⚠️ Order not in activeOrder, trying orderByCode...');
    
    // If activeOrder doesn't work, try orderByCode
    // Note: This will fail for guest orders that are completed
    // In production, you might want to implement a backend solution
    // that stores order access tokens or uses Vendure's order access API
    const response = await fetchGraphQL({
      query: GET_ORDER_BY_CODE,
      variables: { code: orderCode },
    }, {
      req // Pass the request to include cookies
    });

    // Check for authorization errors specifically
    if (response.errors) {
      const isAuthError = response.errors.some(
        err => err.extensions?.code === 'FORBIDDEN' || 
               err.message?.includes('not currently authorized')
      );
      
      if (isAuthError) {
        console.error('❌ Authorization error - order may be completed and require authentication');
        return NextResponse.json(
          { 
            error: 'Order not accessible', 
            details: 'This order has been completed. For security reasons, completed orders require authentication. Please check your email for order confirmation.',
            orderCode: orderCode,
            requiresAuth: true
          },
          { status: 403 }
        );
      }

      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to fetch order', details: response.errors },
        { status: 500 }
      );
    }

    if (!response.data?.orderByCode) {
      console.error('❌ Order not found');
      return NextResponse.json(
        { error: 'Order not found', orderCode: orderCode },
        { status: 404 }
      );
    }

    console.log('✅ Found order via orderByCode');

    // Create response with data
    const nextResponse = NextResponse.json({ order: response.data.orderByCode });

    // Forward Set-Cookie headers from Vendure if present
    if (response.setCookies && response.setCookies.length > 0) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

