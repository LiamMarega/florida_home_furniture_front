import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_ITEM_TO_ORDER, TRANSITION_TO_ADDING } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER_STATE } from '@/lib/graphql/queries';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productVariantId, quantity = 1 } = body as {
      productVariantId: string;
      quantity?: number;
    };

    const validation = validateRequiredFields(body, ['productVariantId']);
    if (!validation.isValid || quantity <= 0) {
      return createErrorResponse(
        'Invalid input',
        'productVariantId is required and quantity must be greater than 0',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const orderStateResult = await fetchGraphQL(
      { query: GET_ACTIVE_ORDER_STATE },
      { req }
    );

    if (orderStateResult.errors) {
      return createErrorResponse(
        'Failed to check order state',
        orderStateResult.errors[0]?.message || 'Failed to check order state',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        orderStateResult.errors
      );
    }

    const state = orderStateResult.data?.activeOrder?.state as string | undefined;

    if (state === 'ArrangingPayment') {
      const transitionResult = await fetchGraphQL(
        { query: TRANSITION_TO_ADDING },
        { req }
      );

      const transition = transitionResult.data?.transitionOrderToState;
      if (transition?.__typename !== 'Order') {
        return createErrorResponse(
          'Order locked during payment',
          'Cannot add items while payment is being processed',
          HTTP_STATUS.CONFLICT,
          'ORDER_LOCKED_DURING_PAYMENT',
          transition
        );
      }
    }

    if (state && state !== 'AddingItems' && state !== 'ArrangingPayment') {
      return createErrorResponse(
        'Order already placed',
        'Order has been confirmed. Create a new order to add items.',
        HTTP_STATUS.CONFLICT,
        'ORDER_ALREADY_PLACED',
        { state }
      );
    }

    const result = await fetchGraphQL(
      { query: ADD_ITEM_TO_ORDER, variables: { productVariantId, qty: quantity } },
      { req }
    );

    if (result.errors) {
      return createErrorResponse(
        'Failed to add item',
        result.errors[0]?.message || 'Failed to add item to cart',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    const res = NextResponse.json(result.data);
    forwardCookies(res, result);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to add item to cart',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
