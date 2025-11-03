// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

const VERIFY_EMAIL_MUTATION = /* GraphQL */ `
  mutation VerifyEmail($token: String!) {
    verifyCustomerAccount(token: $token) {
      __typename
      ... on CurrentUser {
        id
        identifier
      }
      ... on VerificationTokenInvalidError {
        errorCode
        message
      }
      ... on VerificationTokenExpiredError {
        errorCode
        message
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  console.log('[verify] POST request received');
  const raw = await req.json().catch(() => ({}));
  console.log('[verify] Body:', raw);

  const { token } = raw;

  if (!token) {
    console.warn('[verify] Missing token');
    return NextResponse.json(
      { error: 'Token missing' },
      { status: 400 }
    );
  }

  try {
    console.log('[verify] Verifying email with token...');
    const result = await fetchGraphQL(
      {
        query: VERIFY_EMAIL_MUTATION,
        variables: { token },
      },
      { req }
    );

    console.log('[verify] Vendure response:', JSON.stringify(result, null, 2));

    // Manejo de errores
    if (result.errors?.length) {
      console.error('[verify] GraphQL errors:', result.errors);
      return NextResponse.json(
        { errors: result.errors },
        { status: 400 }
      );
    }

    const verifyData = result.data?.verifyCustomerAccount;

    if (!verifyData) {
      console.warn('[verify] No verification data returned');
      return NextResponse.json(
        { error: 'Verification failed - no data returned' },
        { status: 400 }
      );
    }

    // Si es CurrentUser, la verificación fue exitosa
    if (verifyData.__typename === 'CurrentUser') {
      console.log('[verify] Email verified successfully');
      const res = NextResponse.json({
        success: true,
        user: verifyData,
        message: 'Email verified successfully!',
      });

      // Propagar cookies si las hay
      if (result.setCookies?.length) {
        result.setCookies.forEach(cookie => {
          res.headers.append('Set-Cookie', cookie);
        });
      }

      return res;
    }

    // Si hay algún error
    console.warn('[verify] Verification failed:', verifyData);
    return NextResponse.json(
      {
        success: false,
        error: verifyData.message || 'Verification failed',
        errorCode: verifyData.errorCode,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[verify] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}

