import { NextRequest, NextResponse } from 'next/server';
import { REMOVE_ALL_ORDER_LINES } from '@/lib/graphql/mutations';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetchGraphQL(
      {
        query: REMOVE_ALL_ORDER_LINES,
        variables: {},
      },
      {
        headers: {
          'Cookie': cookieHeader,
        },
      }
    );

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to clear cart', details: response.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Clear cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
