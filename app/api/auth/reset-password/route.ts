import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { RESET_PASSWORD_MUTATION } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

const UNSUPPORTED_MEDIA_TYPE = 415;

// Only JSON bodies: a cross-site HTML form cannot send application/json.
function isJsonRequest(req: NextRequest): boolean {
  const contentType = req.headers.get('content-type') ?? '';
  return contentType.split(';')[0].trim().toLowerCase() === 'application/json';
}

async function readJsonObject(req: NextRequest): Promise<Record<string, unknown> | null> {
  const body: unknown = await req.json().catch(() => null);
  return body !== null && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

export async function POST(req: NextRequest) {
  try {
    if (!isJsonRequest(req)) {
      return createErrorResponse(
        'Unsupported media type',
        'Requests must be sent as application/json',
        UNSUPPORTED_MEDIA_TYPE,
        'UNSUPPORTED_MEDIA_TYPE'
      );
    }

    const body = await readJsonObject(req);
    if (!body) {
      return createErrorResponse(
        'Invalid request body',
        'The request body must be a JSON object',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const { token, password } = body;

    const validation = validateRequiredFields(body, ['token', 'password']);
    if (!validation.isValid || typeof token !== 'string' || typeof password !== 'string') {
      return createErrorResponse(
        'Missing fields',
        'Please provide both the reset token and a new password',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await fetchGraphQL(
      {
        query: RESET_PASSWORD_MUTATION,
        variables: { token, password },
      },
      { req }
    );

    if (result.errors?.length) {
      return createErrorResponse(
        'Password reset failed',
        result.errors[0]?.message || 'Unable to reset the password',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    const resetData = result.data?.resetPassword;

    if (resetData?.__typename === 'CurrentUser') {
      // Vendure signs the user in (and marks the account verified), so the
      // session cookie must reach the browser.
      const response = NextResponse.json({
        success: true,
        user: { id: resetData.id, identifier: resetData.identifier },
        message: 'Password updated',
      });
      forwardCookies(response, result);
      return response;
    }

    // PASSWORD_RESET_TOKEN_INVALID_ERROR, PASSWORD_RESET_TOKEN_EXPIRED_ERROR,
    // PASSWORD_VALIDATION_ERROR, NOT_VERIFIED_ERROR, NATIVE_AUTH_STRATEGY_ERROR
    const message =
      resetData?.__typename === 'PasswordValidationError' && resetData.validationErrorMessage
        ? resetData.validationErrorMessage
        : resetData?.message || 'Unable to reset the password';

    return createErrorResponse(
      'Password reset failed',
      message,
      HTTP_STATUS.BAD_REQUEST,
      resetData?.errorCode || ERROR_CODES.VALIDATION_ERROR
    );
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to process password reset',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
