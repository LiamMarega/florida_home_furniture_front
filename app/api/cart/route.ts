// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function GET(req: NextRequest) {
  try {
    const response = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { 
      req,
    });

    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to fetch cart', details: response.errors },
        { status: 500 }
      );
    }

    const activeOrder = response.data?.activeOrder;

    // Create response
    const nextResponse = NextResponse.json({
      activeOrder: activeOrder || null,
    });

   

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}