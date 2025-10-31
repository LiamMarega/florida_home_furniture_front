import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { UPDATE_CUSTOMER_ADDRESS } from '@/lib/graphql/mutations';
import { GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { UserAddress } from '@/app/profile/types';

// PATCH - Set address as default
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // First, get the address to update it
    const customerResult = await fetchGraphQL(
      { query: GET_ACTIVE_CUSTOMER },
      { req }
    );

    if (customerResult.errors) {
      return NextResponse.json(
        { error: 'Failed to fetch customer', details: customerResult.errors },
        { status: 400 }
      );
    }

    const customer = customerResult.data?.activeCustomer;
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const address = customer.addresses?.find((addr: any) => addr.id === id);
    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // Update address to set as default
    const input = {
      id,
      fullName: address.fullName || undefined,
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2 || undefined,
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postalCode || '',
      countryCode: address.country?.code || 'US',
      phoneNumber: address.phoneNumber || undefined,
      defaultShippingAddress: true,
      defaultBillingAddress: true,
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
        { error: 'Failed to set default address', details: result.errors },
        { status: 400 }
      );
    }

    const updatedAddress = result.data?.updateCustomerAddress;
    if (!updatedAddress) {
      return NextResponse.json(
        { error: 'Failed to set default address' },
        { status: 500 }
      );
    }

    const userAddress: UserAddress = {
      id: updatedAddress.id,
      fullName: updatedAddress.fullName || undefined,
      street: updatedAddress.streetLine1,
      streetLine2: updatedAddress.streetLine2 || undefined,
      city: updatedAddress.city || '',
      state: updatedAddress.province || '',
      zipCode: updatedAddress.postalCode || '',
      country: updatedAddress.country?.name || updatedAddress.country?.code || 'US',
      phoneNumber: updatedAddress.phoneNumber || undefined,
      isDefault: true,
    };

    const response = NextResponse.json({ address: userAddress });
    
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('Error setting default address:', error);
    return NextResponse.json(
      { error: 'Failed to set default address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

