import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { LOGIN_MUTATION } from '@/lib/graphql/mutations';
import { AUTH_STATE_QUERY } from '@/lib/graphql/queries';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { emailAddress, password } = body;

    const validation = validateRequiredFields(body, ['emailAddress', 'password']);
    if (!validation.isValid) {
      return createErrorResponse(
        'Missing credentials',
        'Please provide both email and password',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const loginResult = await fetchGraphQL(
      {
        query: LOGIN_MUTATION,
        variables: { username: emailAddress.trim(), password },
      },
      { req }
    );

    if (loginResult.errors) {
      return createErrorResponse(
        'Login failed',
        loginResult.errors[0]?.message || 'Unable to log in',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        loginResult.errors
      );
    }

    const loginData = loginResult.data?.login;

    if (!loginData || loginData.__typename !== 'CurrentUser') {
      if (loginData?.__typename === 'InvalidCredentialsError') {
        return createErrorResponse(
          'Invalid credentials',
          loginData.message || 'Email or password is incorrect',
          HTTP_STATUS.UNAUTHORIZED,
          'INVALID_CREDENTIALS'
        );
      }

      if (loginData?.__typename === 'NotVerifiedError') {
        return createErrorResponse(
          'Email not verified',
          loginData.message || 'Please verify your email before logging in',
          HTTP_STATUS.FORBIDDEN,
          'EMAIL_NOT_VERIFIED'
        );
      }

      return createErrorResponse(
        'Login failed',
        loginData?.message || 'Unable to log in. Please try again.',
        HTTP_STATUS.UNAUTHORIZED,
        'LOGIN_FAILED'
      );
    }

    const authStateResult = await fetchGraphQL(
      { query: AUTH_STATE_QUERY },
      { req }
    );

    const response = NextResponse.json({
      success: true,
      user: loginData,
      auth: authStateResult.data,
      message: 'Login successful',
    });

    forwardCookies(response, loginResult);
    forwardCookies(response, authStateResult);

    return response;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to process login',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

