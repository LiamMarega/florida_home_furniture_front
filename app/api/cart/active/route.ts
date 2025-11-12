import { NextRequest, NextResponse } from 'next/server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { fetchGraphQL } from '@/lib/vendure-server';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const response = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });

    if (response.errors) {
      return createErrorResponse(
        'Failed to get active order',
        response.errors[0]?.message || 'Failed to get active order',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        response.errors
      );
    }

    const res = NextResponse.json(response.data);
    forwardCookies(res, response);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to get active order',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
