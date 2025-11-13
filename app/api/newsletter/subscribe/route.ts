import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName } = await req.json();

    // Validar email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email válido es requerido' },
        { status: 400 }
      );
    }

    // Obtener variables de entorno
    const resendApiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!resendApiKey) {
      console.error('[newsletter] RESEND_API_KEY no está configurada');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }

    if (!audienceId) {
      console.error('[newsletter] RESEND_AUDIENCE_ID no está configurada');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }

    // Inicializar Resend
    const resend = new Resend(resendApiKey);

    // Crear contacto en Resend
    const { data, error } = await resend.contacts.create({
      email: email.trim(),
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      unsubscribed: false,
      audienceId: audienceId,
    });

    if (error) {
      console.error('[newsletter] Error al crear contacto en Resend:', error);
      return NextResponse.json(
        { error: 'Error al suscribirse al newsletter' },
        { status: 500 }
      );
    }

    console.log('[newsletter] Contacto creado exitosamente:', data);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Te has suscrito exitosamente al newsletter',
        data 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[newsletter] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}



