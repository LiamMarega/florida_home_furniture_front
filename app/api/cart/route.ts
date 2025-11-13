import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const response = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });

    if (response.errors) {
      return createErrorResponse(
        'Failed to fetch cart',
        response.errors[0]?.message || 'Failed to fetch cart',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        response.errors
      );
    }

    const res = NextResponse.json({
      activeOrder: response.data?.activeOrder || null,
    });

    forwardCookies(res, response);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to fetch cart',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}