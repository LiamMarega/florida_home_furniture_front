import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { UPDATE_CUSTOMER_ADDRESS, DELETE_CUSTOMER_ADDRESS } from '@/lib/graphql/mutations';
import { GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { UserAddress } from '@/app/profile/types';

// PUT - Update address
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

    const countryCode = country?.length === 2 ? country : 'US';

    const input = {
      id,
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
        query: UPDATE_CUSTOMER_ADDRESS,
        variables: { input },
      },
      { req }
    );

    if (result.errors) {
      return NextResponse.json(
        { error: 'Failed to update address', details: result.errors },
        { status: 400 }
      );
    }

    const address = result.data?.updateCustomerAddress;
    if (!address) {
      return NextResponse.json(
        { error: 'Failed to update address' },
        { status: 500 }
      );
    }

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
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Failed to update address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete address
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await fetchGraphQL(
      {
        query: DELETE_CUSTOMER_ADDRESS,
        variables: { id },
      },
      { req }
    );

    if (result.errors) {
      return NextResponse.json(
        { error: 'Failed to delete address', details: result.errors },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });
    
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Failed to delete address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

