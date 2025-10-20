import { NextRequest, NextResponse } from 'next/server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const response = await fetchGraphQL(
      {
        query: GET_ACTIVE_ORDER,
        variables: {},
      },
      {
        req: request, // Pass the request to include cookies
      }
    );

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to get active order', details: response.errors },
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
    console.error('Get active order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
