import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { REFRESH_CUSTOMER_VERIFICATION_MUTATION } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        query: REFRESH_CUSTOMER_VERIFICATION_MUTATION,
        variables: { emailAddress: email },
      },
      { req }
    );

    if (result.errors?.length) {
      return createErrorResponse(
        'Failed to send verification email',
        result.errors[0]?.message || 'Unable to send the verification email',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        result.errors
      );
    }

    const data = result.data?.refreshCustomerVerification;

    // Vendure answers Success for unknown or already verified emails too,
    // so the response never reveals whether an account exists.
    if (data?.__typename === 'Success') {
      const response = NextResponse.json({
        success: true,
        message: 'We sent a new confirmation link. Check your inbox.',
      });
      forwardCookies(response, result);
      return response;
    }

    return createErrorResponse(
      'Failed to send verification email',
      data?.message || 'Unable to send the verification email',
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
