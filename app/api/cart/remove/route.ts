import { NextRequest, NextResponse } from 'next/server';
import { REMOVE_ORDER_LINE } from '@/lib/graphql/mutations';

const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

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

    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        query: REMOVE_ORDER_LINE,
        variables: {
          orderLineId,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to remove cart item', details: data.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Remove cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
