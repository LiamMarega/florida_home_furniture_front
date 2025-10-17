import { NextRequest, NextResponse } from 'next/server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetchGraphQL(
      {
        query: GET_ACTIVE_ORDER,
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
        { error: 'Failed to get active order', details: response.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Get active order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
