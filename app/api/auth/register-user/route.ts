import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { REGISTER_MUTATION } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { emailAddress, password, firstName, lastName, phoneNumber } = body;

    const validation = validateRequiredFields(body, ['emailAddress', 'password', 'firstName', 'lastName']);
    if (!validation.isValid) {
      return createErrorResponse(
        'Missing required fields',
        `Missing fields: ${validation.missing.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const input = {
      emailAddress: emailAddress.trim(),
      password: password.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber?.trim() || undefined,
    };

    const result = await fetchGraphQL(
      {
        query: REGISTER_MUTATION,
        variables: { input },
      },
      { req }
    );

    if (result.errors?.length) {
      const hasEmailConflict = result.errors.some(err =>
        err.message?.includes('EMAIL_ADDRESS_CONFLICT') ||
        (err.message?.toLowerCase().includes('email') &&
          (err.message?.toLowerCase().includes('already') ||
            err.message?.toLowerCase().includes('exists') ||
            err.message?.toLowerCase().includes('registered')))
      );

      if (hasEmailConflict) {
        return createErrorResponse(
          'Email already registered',
          'This email address is already registered',
          HTTP_STATUS.CONFLICT,
          'EMAIL_ADDRESS_CONFLICT_ERROR'
        );
      }

      return createErrorResponse(
        'Registration failed',
        result.errors[0]?.message || 'Failed to register user',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    const resData = result.data?.registerCustomerAccount;

    if (resData?.__typename === 'ErrorResult') {
      if (resData.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR') {
        return createErrorResponse(
          'Email already registered',
          resData.message || 'This email address is already registered',
          HTTP_STATUS.CONFLICT,
          'EMAIL_ADDRESS_CONFLICT_ERROR'
        );
      }

      return createErrorResponse(
        'Registration failed',
        resData.message || 'Failed to register user',
        HTTP_STATUS.BAD_REQUEST,
        resData.errorCode
      );
    }

    if (resData?.__typename !== 'Success' || !resData.success) {
      return createErrorResponse(
        'Registration failed',
        'Unexpected error occurred during registration',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const response = NextResponse.json({ success: true });
    forwardCookies(response, result);
    return response;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to process registration',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

