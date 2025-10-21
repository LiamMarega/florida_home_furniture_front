import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function GET(req: NextRequest) {
  try {
    console.log('🛒 Fetching active cart...');

    const response = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { req });

    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to fetch cart', details: response.errors },
        { status: 500 }
      );
    }

    const activeOrder = response.data?.activeOrder || null;

    console.log('✅ Active cart fetched:', {
      hasOrder: !!activeOrder,
      orderCode: activeOrder?.code,
      itemCount: activeOrder?.lines?.length || 0,
    });

    // Crear respuesta
    const nextResponse = NextResponse.json({
      activeOrder,
    });

    // Forward cookies si las hay
    if (response.setCookies?.length) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching cart:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}