// app/api/cart/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_ITEM_TO_ORDER } from '@/lib/graphql/mutations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productVariantId, quantity } = body;

    console.log('🛒 Adding to cart:', { productVariantId, quantity });

    if (!productVariantId || !quantity) {
      return NextResponse.json(
        { error: 'Product variant ID and quantity are required' },
        { status: 400 }
      );
    }

    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Add to cart cookies:', cookieHeader?.substring(0, 80) + '...');

    const response = await fetchGraphQL({
      query: ADD_ITEM_TO_ORDER,
      variables: { 
        productVariantId, 
        quantity: parseInt(quantity.toString(), 10),
      },
    }, { 
      req,
      cookie: cookieHeader || undefined,
    });

    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to add item to cart', details: response.errors },
        { status: 500 }
      );
    }

    const result = response.data?.addItemToOrder;

    // Handle Vendure error results
    if (result?.errorCode) {
      console.error('❌ Vendure error:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to add item to cart',
          errorCode: result.errorCode,
          details: result,
        },
        { status: 400 }
      );
    }

    if (!result || !result.id) {
      console.error('❌ Invalid response');
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    console.log('✅ Item added to cart:', { 
      orderCode: result.code,
      totalItems: result.totalQuantity,
    });

    // Create response
    const nextResponse = NextResponse.json({ order: result });

    // 🍪 CRÍTICO: Forward Set-Cookie headers
    if (response.setCookies && response.setCookies.length > 0) {
      console.log('🍪 Forwarding', response.setCookies.length, 'Set-Cookie header(s)');
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}