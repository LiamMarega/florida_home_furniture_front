import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_ORDER_SHIPPING_ADDRESS } from '@/lib/graphql/mutations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      streetLine1,
      streetLine2,
      city,
      province,
      postalCode,
      country,
      phoneNumber,
      customerId,
      customerEmail,
    } = body;

    console.log('📍 Setting shipping address:', { fullName, streetLine1, city, province, postalCode });

    if (!fullName || !streetLine1 || !city || !province || !postalCode) {
      console.error('❌ Missing required address fields');
      return NextResponse.json(
        { error: 'Missing required address fields' },
        { status: 400 }
      );
    }


    const response = await fetchGraphQL({
      query: SET_ORDER_SHIPPING_ADDRESS,
      variables: {
        input: {
          fullName,
          streetLine1,
          streetLine2: streetLine2 || '',
          city,
          province,
          postalCode,
          countryCode: country || 'US',
          phoneNumber: phoneNumber || '',
          customerId: customerId || '',
          customerEmail: customerEmail || '',
        },
      },
    }, {
      req // Pass the request to include cookies
    });

    // Handle GraphQL-level errors
    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to set shipping address', details: response.errors },
        { status: 500 }
      );
    }

    const result = response.data?.setOrderShippingAddress;

    // Handle Vendure error results (check both __typename and errorCode)
    if (result?.__typename && result.__typename !== 'Order') {
      console.error('❌ ErrorResult by __typename:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to set shipping address',
          errorCode: result.errorCode,
          details: result
        },
        { status: 400 }
      );
    }

    if (result?.errorCode) {
      console.error('❌ ErrorResult by errorCode:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to set shipping address',
          errorCode: result.errorCode,
          details: result
        },
        { status: 400 }
      );
    }

    // Verify we have a valid order
    if (!result || !result.id) {
      console.error('❌ Invalid response: No order returned');
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    console.log('✅ Shipping address set successfully');
    
    // Create response with data
    const nextResponse = NextResponse.json({ order: result });

    // Forward Set-Cookie headers from Vendure if present
    if (response.setCookies && response.setCookies.length > 0) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error setting shipping address:', error);
    return NextResponse.json(
      { error: 'Failed to set shipping address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

