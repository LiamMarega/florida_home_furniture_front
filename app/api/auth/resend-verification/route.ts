import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, validateRequiredFields, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    const validation = validateRequiredFields(body, ['email']);
    if (!validation.isValid) {
      return createErrorResponse(
        'Email required',
        'Email address is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'If your account exists and is not verified, please try registering again with the same email. Vendure will resend the verification email.',
    });
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to process request',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

