import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { CREATE_CUSTOMER_ADDRESS as CREATE_ADDRESS_MUTATION } from '@/lib/graphql/mutations';
import { UserAddress } from '@/app/profile/types';

// GET - Fetch user addresses
export async function GET(req: NextRequest) {
  try {
    const result = await fetchGraphQL(
      { query: GET_ACTIVE_CUSTOMER },
      { req }
    );

    if (result.errors) {
      const isUnauthorized = result.errors.some(
        (e) => e.extensions?.code === 'FORBIDDEN' || e.message?.includes('not currently authorized')
      );

      if (isUnauthorized) {
        return NextResponse.json(
          { error: 'Authentication required', addresses: [] },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch addresses', details: result.errors },
        { status: 500 }
      );
    }

    const customer = result.data?.activeCustomer;
    
    if (!customer) {
      return NextResponse.json({ addresses: [] });
    }

    // Transform Vendure addresses to UserAddress format
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

    const response = NextResponse.json({ addresses });
    
    // Forward cookies if present
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new address
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nickname,
      fullName,
      street,
      streetLine2,
      city,
      state,
      zipCode,
      country,
      phoneNumber,
      isDefault,
    } = body;

    if (!street || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required address fields' },
        { status: 400 }
      );
    }

    // Convert country name to code if needed (simplified - you might want a mapping)
    const countryCode = country?.length === 2 ? country : 'US';

    const input = {
      fullName: fullName || undefined,
      streetLine1: street,
      streetLine2: streetLine2 || undefined,
      city,
      province: state,
      postalCode: zipCode,
      countryCode: countryCode,
      phoneNumber: phoneNumber || undefined,
      defaultShippingAddress: isDefault || false,
      defaultBillingAddress: isDefault || false,
    };

    const result = await fetchGraphQL(
      {
        query: CREATE_ADDRESS_MUTATION,
        variables: { input },
      },
      { req }
    );

    if (result.errors) {
      return NextResponse.json(
        { error: 'Failed to create address', details: result.errors },
        { status: 400 }
      );
    }

    const address = result.data?.createCustomerAddress;
    if (!address) {
      return NextResponse.json(
        { error: 'Failed to create address' },
        { status: 500 }
      );
    }

    // Transform to UserAddress format
    const userAddress: UserAddress = {
      id: address.id,
      nickname: nickname || undefined,
      fullName: address.fullName || undefined,
      street: address.streetLine1,
      streetLine2: address.streetLine2 || undefined,
      city: address.city || '',
      state: address.province || '',
      zipCode: address.postalCode || '',
      country: address.country?.name || address.country?.code || country,
      phoneNumber: address.phoneNumber || undefined,
      isDefault: address.defaultShippingAddress || address.defaultBillingAddress || false,
    };

    const response = NextResponse.json({ address: userAddress });
    
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Failed to create address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

