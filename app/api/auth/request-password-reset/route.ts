import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { REQUEST_PASSWORD_RESET_MUTATION } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!email || !EMAIL_PATTERN.test(email)) {
      return createErrorResponse(
        'Invalid email',
        'Please provide a valid email address',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await fetchGraphQL(
      {
        query: REQUEST_PASSWORD_RESET_MUTATION,
        variables: { emailAddress: email },
      },
      { req }
    );

    if (result.errors?.length) {
      return createErrorResponse(
        'Failed to request password reset',
        result.errors[0]?.message || 'Unable to send the password reset email',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    const data = result.data?.requestPasswordReset;

    // Vendure answers Success for unknown emails too (no account enumeration).
    if (data?.__typename === 'Success') {
      const response = NextResponse.json({
        success: true,
        message: 'If an account exists for this email, a reset link is on its way.',
      });
      forwardCookies(response, result);
      return response;
    }

    return createErrorResponse(
      'Failed to request password reset',
      data?.message || 'Unable to send the password reset email',
      HTTP_STATUS.BAD_REQUEST,
      data?.errorCode || ERROR_CODES.VALIDATION_ERROR
    );
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to process request',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
