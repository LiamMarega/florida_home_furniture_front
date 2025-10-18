import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_ORDER_BILLING_ADDRESS } from '@/lib/graphql/mutations';

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
    } = body;

    console.log('💳 Setting billing address:', { fullName, streetLine1, city, province, postalCode });

    if (!fullName || !streetLine1 || !city || !province || !postalCode) {
      console.error('❌ Missing required address fields');
      return NextResponse.json(
        { error: 'Missing required address fields' },
        { status: 400 }
      );
    }

    console.log('🍪 Request cookies:', req.headers.get('cookie')?.substring(0, 50) + '...');

    const response = await fetchGraphQL({
      query: SET_ORDER_BILLING_ADDRESS,
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
        },
      },
    }, {
      req // Pass the request to include cookies
    });

    console.log('📦 Vendure response:', JSON.stringify(response, null, 2));

    // Handle GraphQL-level errors
    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to set billing address', details: response.errors },
        { status: 500 }
      );
    }

    const result = response.data?.setOrderBillingAddress;

    // Handle Vendure error results (check both __typename and errorCode)
    if (result?.__typename && result.__typename !== 'Order') {
      console.error('❌ ErrorResult by __typename:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to set billing address',
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
          error: result.message || 'Failed to set billing address',
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

    console.log('✅ Billing address set successfully');
    return NextResponse.json({ order: result });
  } catch (error) {
    console.error('💥 Error setting billing address:', error);
    return NextResponse.json(
      { error: 'Failed to set billing address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

