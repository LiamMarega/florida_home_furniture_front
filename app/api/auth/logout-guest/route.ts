import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { LOGOUT } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');

    const orderBeforeLogout = await fetchGraphQL<{ activeOrder: any }>(
      { query: GET_ACTIVE_ORDER },
      { req, cookie: cookieHeader || undefined }
    );

    const orderBefore = orderBeforeLogout.data?.activeOrder;
    const hasOrderBefore = !!orderBefore && 'id' in orderBefore;

    const logoutRes = await fetchGraphQL<{ logout: { success: boolean } }>(
      { query: LOGOUT },
      { req, cookie: cookieHeader || undefined }
    );

    if (logoutRes.errors) {
      return createErrorResponse(
        'Logout failed',
        logoutRes.errors[0]?.message || 'Failed to logout',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        logoutRes.errors
      );
    }

    const orderAfterLogout = await fetchGraphQL<{ activeOrder: any }>(
      { query: GET_ACTIVE_ORDER },
      { req, cookie: cookieHeader || undefined }
    );

    const orderAfter = orderAfterLogout.data?.activeOrder;
    const hasOrderAfter = !!orderAfter && 'id' in orderAfter;

    const response = NextResponse.json({
      success: true,
      orderPreserved: hasOrderAfter,
      message: hasOrderAfter
        ? 'Logged out, order preserved'
        : 'Logged out, order cleared',
    });

    forwardCookies(response, logoutRes);
    forwardCookies(response, orderAfterLogout);

    return response;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to logout',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

