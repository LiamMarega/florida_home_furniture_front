import { NextRequest, NextResponse } from 'next/server';
import { REMOVE_ORDER_LINE } from '@/lib/graphql/mutations';
import { fetchGraphQL } from '@/lib/vendure-server';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderLineId } = body;

    const validation = validateRequiredFields(body, ['orderLineId']);
    if (!validation.isValid) {
      return createErrorResponse(
        'orderLineId required',
        'orderLineId is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const response = await fetchGraphQL(
      { query: REMOVE_ORDER_LINE, variables: { orderLineId } },
      { req }
    );

    if (response.errors) {
      return createErrorResponse(
        'Failed to remove cart item',
        response.errors[0]?.message || 'Failed to remove cart item',
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
      error instanceof Error ? error.message : 'Failed to remove cart item',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
