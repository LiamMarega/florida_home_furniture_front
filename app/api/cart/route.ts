// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function GET(req: NextRequest) {
  try {
    console.log('🛒 Fetching active cart...');
    
    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Cart request cookies:', cookieHeader?.substring(0, 80) + '...');
    
    const response = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { 
      req,
      cookie: cookieHeader || undefined,
    });

    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to fetch cart', details: response.errors },
        { status: 500 }
      );
    }

    const activeOrder = response.data?.activeOrder;

    console.log('✅ Active cart fetched:', { 
      hasOrder: !!activeOrder, 
      orderCode: activeOrder?.code,
      itemCount: activeOrder?.lines?.length || 0,
      state: activeOrder?.state,
    });

    // Create response
    const nextResponse = NextResponse.json({
      activeOrder: activeOrder || null,
    });

    // 🍪 CRÍTICO: Forward Set-Cookie headers from Vendure
    if (response.setCookies && response.setCookies.length > 0) {
      console.log('🍪 Forwarding', response.setCookies.length, 'Set-Cookie header(s)');
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}