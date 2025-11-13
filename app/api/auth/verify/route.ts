import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { VERIFY_EMAIL_MUTATION } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    const validation = validateRequiredFields(body, ['token']);
    if (!validation.isValid) {
      return createErrorResponse(
        'Token missing',
        'Verification token is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await fetchGraphQL(
      {
        query: VERIFY_EMAIL_MUTATION,
        variables: { token },
      },
      { req }
    );

    if (result.errors?.length) {
      return createErrorResponse(
        'Verification failed',
        result.errors[0]?.message || 'Failed to verify email',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    const verifyData = result.data?.verifyCustomerAccount;

    if (!verifyData) {
      return createErrorResponse(
        'Verification failed',
        'No verification data returned',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (verifyData.__typename === 'CurrentUser') {
      const response = NextResponse.json({
        success: true,
        user: verifyData,
        message: 'Email verified successfully! You can now log in.',
      });

      forwardCookies(response, result);
      return response;
    }

    let errorMessage = 'Verification failed';
    if (verifyData.__typename === 'VerificationTokenInvalidError') {
      errorMessage = 'Invalid verification token. Please request a new verification email.';
    } else if (verifyData.__typename === 'VerificationTokenExpiredError') {
      errorMessage = 'Verification token has expired. Please request a new verification email.';
    } else {
      errorMessage = verifyData.message || 'Verification failed';
    }

    return createErrorResponse(
      'Verification failed',
      errorMessage,
      HTTP_STATUS.BAD_REQUEST,
      verifyData.errorCode
    );
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to process verification',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

