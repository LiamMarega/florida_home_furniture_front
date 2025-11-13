import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { REMOVE_ORDER_LINE } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const orderResponse = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });

    if (orderResponse.errors) {
      return createErrorResponse(
        'Failed to fetch cart',
        orderResponse.errors[0]?.message || 'Failed to fetch cart',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        orderResponse.errors
      );
    }

    const activeOrder = orderResponse.data?.activeOrder;

    if (!activeOrder || !activeOrder.lines || activeOrder.lines.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Cart is already empty',
      });
    }

    let lastResponse = orderResponse;
    for (const line of activeOrder.lines) {
      const removeResponse = await fetchGraphQL(
        { query: REMOVE_ORDER_LINE, variables: { orderLineId: line.id } },
        { req }
      );
      if (!removeResponse.errors) {
        lastResponse = removeResponse;
      }
    }

    const res = NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
    });

    forwardCookies(res, lastResponse);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to clear cart',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}