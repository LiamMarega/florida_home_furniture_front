import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';
import { AUTH_STATE_QUERY } from '@/lib/graphql/queries';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = {
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      emailAddress: body.emailAddress?.trim(),
      phoneNumber: body.phoneNumber?.trim() || undefined,
    };

    const auth = await fetchGraphQL({ query: AUTH_STATE_QUERY }, { req });
    const meForbiddenOnly =
      auth.errors?.length &&
      auth.errors.every((e) => e.extensions?.code === 'FORBIDDEN' && e.path?.[0] === 'me');

    const isLoggedIn = !!auth.data?.me || !!auth.data?.activeCustomer;
    if (isLoggedIn) {
      const res = NextResponse.json({ auth: auth.data });
      forwardCookies(res, auth);
      return res;
    }

    const validation = validateRequiredFields(input, ['firstName', 'lastName', 'emailAddress']);
    if (!validation.isValid) {
      return createErrorResponse(
        'Missing required customer fields',
        `Missing fields: ${validation.missing.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await fetchGraphQL(
      { query: SET_CUSTOMER_FOR_ORDER, variables: { input } },
      { req }
    );

    if (result.errors && !meForbiddenOnly) {
      return createErrorResponse(
        'Failed to set customer',
        result.errors[0]?.message || 'Failed to set customer for order',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    if (result.data?.setCustomerForOrder?.errorCode) {
      return createErrorResponse(
        'Failed to set customer',
        result.data.setCustomerForOrder.message || 'Failed to set customer for order',
        HTTP_STATUS.BAD_REQUEST,
        result.data.setCustomerForOrder.errorCode,
        result.data.setCustomerForOrder
      );
    }

    const res = NextResponse.json(result.data);
    forwardCookies(res, result);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to set customer',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
