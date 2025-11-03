// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

/**
 * Nota: Vendure no tiene una mutación directa para reenviar emails de verificación.
 * La mejor práctica es usar requestPasswordReset que puede enviar un email,
 * o intentar registrar nuevamente (que Vendure maneja inteligentemente).
 * 
 * Por seguridad y UX, retornamos un mensaje informativo.
 * En producción, podrías implementar una mutación personalizada en Vendure
 * o usar el endpoint de registro con un manejo especial.
 */
const REQUEST_PASSWORD_RESET = /* GraphQL */ `
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      __typename
      ... on Success {
        success
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  console.log('[resend-verification] POST request received');
  const raw = await req.json().catch(() => ({}));
  console.log('[resend-verification] Body:', raw);

  const { email } = raw;

  if (!email) {
    console.warn('[resend-verification] Missing email');
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  try {
    console.log('[resend-verification] Attempting to resend verification for:', email);
    
    // Opción 1: Intentar usar requestPasswordReset (no ideal pero funcional)
    // Esto enviará un email de reset, no de verificación
    // const result = await fetchGraphQL(
    //   {
    //     query: REQUEST_PASSWORD_RESET,
    //     variables: { email },
    //   },
    //   { req }
    // );

    // Por ahora, retornamos un mensaje informativo
    // En una implementación completa, podrías:
    // 1. Implementar una mutación personalizada en Vendure para reenviar verificación
    // 2. Intentar registrar nuevamente (requiere todos los datos)
    // 3. Contactar al administrador para reenviar manualmente
    
    return NextResponse.json({
      success: true,
      message: 'If your account exists and is not verified, please try registering again with the same email. Vendure will resend the verification email.',
    });
  } catch (error) {
    console.error('[resend-verification] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend verification email',
      },
      { status: 500 }
    );
  }
}

