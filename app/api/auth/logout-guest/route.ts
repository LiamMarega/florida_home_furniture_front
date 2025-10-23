// app/api/auth/logout-guest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { LOGOUT } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { Success, ActiveOrderResult } from '@/lib/types';

/**
 * Logout para limpiar sesiones autenticadas previas
 * Usado para permitir checkout como invitado cuando hay sesión autenticada
 */
export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    
    // Verificar si hay orden activa antes del logout
    const orderBeforeLogout = await fetchGraphQL<{ activeOrder: ActiveOrderResult }>({
      query: GET_ACTIVE_ORDER,
    }, { req, cookie: cookieHeader || undefined });
    
    const orderBefore = orderBeforeLogout.data?.activeOrder;
    console.log('📦 Order before logout:', {
      hasOrder: !!orderBefore && 'id' in orderBefore,
      orderCode: orderBefore && 'code' in orderBefore ? orderBefore.code : null,
      itemCount: orderBefore && 'lines' in orderBefore ? orderBefore.lines?.length || 0 : 0,
    });

    // Hacer logout
    const logoutRes = await fetchGraphQL<{ logout: Success }>({
      query: LOGOUT,
    }, { req, cookie: cookieHeader || undefined });

    if (!logoutRes.data?.logout?.success) {
      console.warn('⚠️ Logout may have failed');
    }

    // Verificar orden después del logout
    const orderAfterLogout = await fetchGraphQL<{ activeOrder: ActiveOrderResult }>({
      query: GET_ACTIVE_ORDER,
    }, { req, cookie: cookieHeader || undefined });
    
    const orderAfter = orderAfterLogout.data?.activeOrder;
    console.log('📦 Order after logout:', {
      hasOrder: !!orderAfter && 'id' in orderAfter,
      orderCode: orderAfter && 'code' in orderAfter ? orderAfter.code : null,
      itemCount: orderAfter && 'lines' in orderAfter ? orderAfter.lines?.length || 0 : 0,
    });

    const response = NextResponse.json({ 
      success: true,
      orderPreserved: !!orderAfter && 'id' in orderAfter,
      message: orderAfter && 'id' in orderAfter ? 'Logged out, order preserved' : 'Logged out, order cleared'
    });

    // Forward cookies if any
    if (logoutRes.setCookies?.length) {
      logoutRes.setCookies.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('💥 Error logging out:', error);
    return NextResponse.json({ 
      error: 'Failed to logout', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

