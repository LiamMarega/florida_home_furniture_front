import { NextRequest, NextResponse } from 'next/server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        query: GET_ACTIVE_ORDER,
        variables: {},
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to get active order', details: data.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Get active order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
