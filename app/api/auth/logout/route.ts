import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { LOGOUT } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const response = await fetchGraphQL<{ logout: { success: boolean } }>(
      { query: LOGOUT },
      { req }
    );

    if (response.errors) {
      return createErrorResponse(
        'Logout failed',
        response.errors[0]?.message || 'Failed to logout',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        response.errors
      );
    }

    const logoutResult = response.data?.logout;
    if (!logoutResult?.success) {
      return createErrorResponse(
        'Logout failed',
        'Logout operation did not complete successfully',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const res = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    forwardCookies(res, response);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to logout',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

