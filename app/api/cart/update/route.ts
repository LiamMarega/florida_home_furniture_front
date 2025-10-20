import { NextRequest, NextResponse } from 'next/server';
import { ADJUST_ORDER_LINE } from '@/lib/graphql/mutations';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { orderLineId, quantity } = await request.json();

    if (!orderLineId || quantity === undefined) {
      return NextResponse.json(
        { error: 'orderLineId and quantity are required' },
        { status: 400 }
      );
    }

    const response = await fetchGraphQL(
      {
        query: ADJUST_ORDER_LINE,
        variables: {
          orderLineId,
          quantity: Number(quantity),
        },
      },
      {
        req: request, // Pass the request to include cookies
      }
    );

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to update cart item', details: response.errors },
        { status: 400 }
      );
    }

    // Create response with data
    const nextResponse = NextResponse.json(response.data);

    // Forward Set-Cookie headers from Vendure if present
    if (response.setCookies && response.setCookies.length > 0) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
