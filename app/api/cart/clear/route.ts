import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { REMOVE_ORDER_LINE } from '@/lib/graphql/mutations';

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Clearing cart...');

    // 1. Obtener la orden activa
    const orderResponse = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { req });

    const activeOrder = orderResponse.data?.activeOrder;

    if (!activeOrder || !activeOrder.lines || activeOrder.lines.length === 0) {
      console.log('ℹ️ No active order or cart already empty');
      return NextResponse.json({
        success: true,
        message: 'Cart is already empty',
      });
    }

    console.log(`🗑️ Removing ${activeOrder.lines.length} items from cart...`);

    // 2. Remover todos los items uno por uno
    for (const line of activeOrder.lines) {
      console.log(`Removing line ${line.id}...`);
      
      const removeResponse = await fetchGraphQL({
        query: REMOVE_ORDER_LINE,
        variables: { orderLineId: line.id },
      }, { req });

      if (removeResponse.errors) {
        console.error('❌ Error removing line:', removeResponse.errors);
        // Continuar con los demás items
      }
    }

    console.log('✅ Cart cleared successfully');

    const nextResponse = NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
    });

    // Forward cookies de la última operación
    if (orderResponse.setCookies?.length) {
      orderResponse.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error clearing cart:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}