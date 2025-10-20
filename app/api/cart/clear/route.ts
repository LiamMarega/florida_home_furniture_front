import { NextRequest, NextResponse } from 'next/server';
import { REMOVE_ALL_ORDER_LINES } from '@/lib/graphql/mutations';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const response = await fetchGraphQL(
      {
        query: REMOVE_ALL_ORDER_LINES,
        variables: {},
      },
      {
        req: request, // Pass the request to include cookies
      }
    );

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to clear cart', details: response.errors },
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
    console.error('Clear cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
