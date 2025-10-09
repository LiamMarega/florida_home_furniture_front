import { NextRequest, NextResponse } from 'next/server';
import { ADD_ITEM_TO_ORDER } from '@/lib/graphql/mutations';

const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { productVariantId, quantity } = await request.json();

    if (!productVariantId || !quantity) {
      return NextResponse.json(
        { error: 'productVariantId and quantity are required' },
        { status: 400 }
      );
    }

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        query: ADD_ITEM_TO_ORDER,
        variables: {
          productVariantId,
          quantity: Number(quantity),
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to add item to cart', details: data.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
