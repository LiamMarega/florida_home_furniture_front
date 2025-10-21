import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

// Mutation para limpiar el carrito actual
const CLEAR_CART = `
  mutation {
    clearOrder {
      __typename
      ... on Order {
        id
        code
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Clearing cart...');

    const response = await fetchGraphQL({
      query: CLEAR_CART,
    }, { req });

    if (response.errors) {
      console.error('❌ Error clearing cart:', response.errors);
      return NextResponse.json(
        { error: 'Failed to clear cart', details: response.errors },
        { status: 500 }
      );
    }

    console.log('✅ Cart cleared successfully');

    // Crear respuesta y pasar las cookies actualizadas
    const nextResponse = NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
    });

    // Forward cookies si hay
    if (response.setCookies?.length) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error in clear cart:', error);
    return NextResponse.json(
      { error: 'Failed to clear cart' },
      { status: 500 }
    );
  }
}