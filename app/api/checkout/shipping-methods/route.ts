import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ELIGIBLE_SHIPPING_METHODS } from '@/lib/graphql/queries';

export async function GET(req: NextRequest) {
  try {

    const response = await fetchGraphQL({
      query: GET_ELIGIBLE_SHIPPING_METHODS,
    }, {
      req // Pass the request to include cookies
    });
    

    // Handle GraphQL-level errors
    if (response.errors) {
      return NextResponse.json(
        { error: 'Failed to fetch shipping methods', details: response.errors },
        { status: 500 }
      );
    }

    const shippingMethods = response.data?.eligibleShippingMethods;

    // Verify we got a valid response
    if (!shippingMethods || !Array.isArray(shippingMethods)) {
      return NextResponse.json(
        { error: 'Invalid response from server', shippingMethods: [] },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${shippingMethods.length} shipping method(s)`);
    
    // Create response with data
    const nextResponse = NextResponse.json({
      shippingMethods,
    });

    // Forward Set-Cookie headers from Vendure if present
    if (response.setCookies && response.setCookies.length > 0) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch shipping methods', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

