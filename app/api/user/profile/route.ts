import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { UserProfile, UserAddress, UserOrder, OrderProduct } from '@/app/profile/types';

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

// GET - Fetch user profile
export async function GET(req: NextRequest) {
  try {
    console.log('[PROFILE API] Starting profile fetch...');
    
    const { searchParams } = new URL(req.url);
    const orderLimit = searchParams.get('orderLimit') || '10';
    const orderPage = searchParams.get('orderPage') || '1';

    // Build order options
    const take = Math.min(parseInt(orderLimit, 10), 50);
    const currentPage = Math.max(parseInt(orderPage, 10), 1);
    const skip = (currentPage - 1) * take;

    const orderOptions: any = {
      take,
      skip,
      sort: { createdAt: 'DESC' },
    };

    console.log('[PROFILE API] Request params:', { orderLimit, orderPage, orderOptions });
    console.log('[PROFILE API] Cookies from request:', req.headers.get('cookie')?.substring(0, 100) || 'No cookies');

    const result = await fetchGraphQL(
      { 
        query: GET_ACTIVE_CUSTOMER,
        variables: { orderOptions },
      },
      { req }
    );

    console.log('[PROFILE API] GraphQL result:', {
      hasData: !!result.data,
      hasErrors: !!result.errors,
      errorsCount: result.errors?.length || 0,
      errors: result.errors,
      dataKeys: result.data ? Object.keys(result.data) : [],
      activeCustomerExists: !!result.data?.activeCustomer,
      activeCustomerType: result.data?.activeCustomer ? typeof result.data.activeCustomer : 'null',
    });

    if (result.errors) {
      console.log('[PROFILE API] GraphQL errors detected:', JSON.stringify(result.errors, null, 2));
      
      const isUnauthorized = result.errors.some(
        (e) => e.extensions?.code === 'FORBIDDEN' || e.message?.includes('not currently authorized')
      );

      if (isUnauthorized) {
        console.log('[PROFILE API] Unauthorized - returning 401');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      console.log('[PROFILE API] Other errors - returning 500');
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: result.errors },
        { status: 500 }
      );
    }

    const customer = result.data?.activeCustomer;
    
    console.log('[PROFILE API] Customer data:', {
      customerExists: !!customer,
      customerId: customer?.id,
      customerEmail: customer?.emailAddress,
      customerFirstName: customer?.firstName,
      customerLastName: customer?.lastName,
      addressesCount: customer?.addresses?.length || 0,
      ordersCount: customer?.orders?.items?.length || 0,
      ordersTotalItems: customer?.orders?.totalItems || 0,
      fullCustomerData: JSON.stringify(customer, null, 2).substring(0, 500), // First 500 chars for debugging
    });
    
    if (!customer) {
      console.log('[PROFILE API] Customer is null - user not authenticated or not found');
      console.log('[PROFILE API] Full result.data:', JSON.stringify(result.data, null, 2));
      return NextResponse.json(
        { error: 'Customer not found - user may not be authenticated' },
        { status: 401 }
      );
    }

    console.log('[PROFILE API] Starting data transformation...');
    
    // Transform addresses
    const addresses: UserAddress[] = (customer.addresses || []).map((addr: any) => ({
      id: addr.id,
      nickname: addr.nickname || undefined,
      fullName: addr.fullName || undefined,
      street: addr.streetLine1,
      streetLine2: addr.streetLine2 || undefined,
      city: addr.city || '',
      state: addr.province || '',
      zipCode: addr.postalCode || '',
      country: addr.country?.name || addr.country?.code || 'US',
      phoneNumber: addr.phoneNumber || undefined,
      isDefault: addr.defaultShippingAddress || addr.defaultBillingAddress || false,
    }));

    console.log('[PROFILE API] Transformed addresses:', addresses.length);

    // Transform orders
    const ordersData = customer.orders;
    const ordersTotalItems = ordersData?.totalItems || 0;
    
    console.log('[PROFILE API] Orders data:', {
      ordersExists: !!ordersData,
      itemsCount: ordersData?.items?.length || 0,
      totalItems: ordersTotalItems,
    });
    
    const orders: UserOrder[] = (ordersData?.items || []).map((order: any) => {
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

    const profile: UserProfile = {
      id: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      emailAddress: customer.emailAddress,
      addresses,
      orders,
      ordersTotalItems,
    };

    console.log('[PROFILE API] Final profile:', {
      id: profile.id,
      email: profile.emailAddress,
      addressesCount: profile.addresses?.length || 0,
      ordersCount: profile.orders?.length || 0,
      ordersTotalItems: profile.ordersTotalItems,
    });

    const response = NextResponse.json({ profile });
    
    // Forward cookies if present
    if (result.setCookies) {
      console.log('[PROFILE API] Forwarding cookies:', result.setCookies.length);
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    console.log('[PROFILE API] Successfully returning profile');
    return response;
  } catch (error) {
    console.error('[PROFILE API] Error fetching profile:', error);
    console.error('[PROFILE API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

