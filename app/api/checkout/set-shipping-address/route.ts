import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_ORDER_SHIPPING_ADDRESS } from '@/lib/graphql/mutations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      streetLine1,
      streetLine2,
      city,
      province,
      postalCode,
      country,      // ej: 'AR' o 'US'
      phoneNumber,
      // ❌ eliminar estos:
      // customerId,
      // customerEmail,
    } = body;

    if (!fullName || !streetLine1 || !city || !province || !postalCode) {
      return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
    }

    // Validar countryCode: Vendure usa ISO 3166-1 alpha-2 (ej: 'AR', 'US')
    const countryCode = (country || 'US').toUpperCase();

    const response = await fetchGraphQL({
      query: SET_ORDER_SHIPPING_ADDRESS,
      variables: {
        input: {
          fullName,
          streetLine1,
          streetLine2: streetLine2 || '',
          city,
          province,
          postalCode,
          countryCode,          // ✅ correcto
          phoneNumber: phoneNumber || '',
          // ❌ NO agregar customerId / customerEmail aquí
        },
      },
    }, { req });

    if (response.errors) {
      return NextResponse.json(
        { error: 'Failed to set shipping address', details: response.errors },
        { status: 400 } // es input inválido, mejor 400 que 500
      );
    }

    const result = response.data?.setOrderShippingAddress;

    if (result?.__typename && result.__typename !== 'Order') {
      return NextResponse.json(
        { error: result.message || 'Failed to set shipping address', errorCode: result.errorCode, details: result },
        { status: 400 }
      );
    }

    if (!result?.id) {
      return NextResponse.json({ error: 'Invalid response from server' }, { status: 500 });
    }

    const nextResponse = NextResponse.json({ order: result });

    if (response.setCookies?.length) {
      response.setCookies.forEach((cookie: string) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }
    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set shipping address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
