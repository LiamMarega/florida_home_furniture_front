import { NextRequest, NextResponse } from 'next/server';
import { ADD_ITEM_TO_ORDER } from '@/lib/graphql/mutations';
import { fetchGraphQL } from '@/lib/vendure-server';

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

    const response = await fetchGraphQL(
      {
        query: ADD_ITEM_TO_ORDER,
        variables: {
          productVariantId,
          quantity: Number(quantity),
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
        { error: 'Failed to add item to cart', details: response.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
