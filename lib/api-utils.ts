import { NextResponse } from 'next/server';
import { GraphQLResponse } from './vendure-server';

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

export function createErrorResponse(
  error: string,
  message: string,
  status: number,
  code?: string,
  details?: any
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      message,
      ...(code && { code }),
      ...(details && { details }),
    },
    { status }
  );
}

export function handleGraphQLErrors<T>(
  response: GraphQLResponse<T>,
  defaultMessage = 'Operation failed'
): NextResponse<ApiError> | null {
  if (!response.errors || response.errors.length === 0) {
    return null;
  }

  const firstError = response.errors[0];
  const errorCode = firstError.extensions?.code;

  if (errorCode === 'FORBIDDEN') {
    return createErrorResponse(
      'Authentication required',
      'You must be logged in to perform this action',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_REQUIRED
    );
  }

  if (errorCode === 'NOT_FOUND') {
    return createErrorResponse(
      'Resource not found',
      firstError.message || defaultMessage,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  return createErrorResponse(
    'Operation failed',
    firstError.message || defaultMessage,
    HTTP_STATUS.BAD_REQUEST,
    ERROR_CODES.VALIDATION_ERROR,
    response.errors
  );
}

export function forwardCookies(
  response: NextResponse,
  graphQLResponse: GraphQLResponse
): void {
  if (graphQLResponse.setCookies?.length) {
    graphQLResponse.setCookies.forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });
  }
}

export function validateRequiredFields(
  body: Record<string, any>,
  fields: string[]
): { isValid: boolean; missing: string[] } {
  const missing = fields.filter((field) => !body[field]);
  return {
    isValid: missing.length === 0,
    missing,
  };
}

