import { NextRequest, NextResponse } from 'next/server';
import { REMOVE_ORDER_LINE } from '@/lib/graphql/mutations';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { orderLineId } = await request.json();

    if (!orderLineId) {
      return NextResponse.json(
        { error: 'orderLineId is required' },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetchGraphQL(
      {
        query: REMOVE_ORDER_LINE,
        variables: {
          orderLineId,
        },
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
        { error: 'Failed to remove cart item', details: response.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Remove cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
