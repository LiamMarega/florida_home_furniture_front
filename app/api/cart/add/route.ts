// app/api/cart/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_ITEM_TO_ORDER } from '@/lib/graphql/mutations';
import { ORDER_SUMMARY_FRAGMENT } from '@/lib/graphql/fragments';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { productVariantId, quantity = 1 } = body as {
    productVariantId: string;
    quantity?: number;
  };

  if (!productVariantId || quantity <= 0) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Inyectamos el fragmento al query
  const query = `${ORDER_SUMMARY_FRAGMENT}\n${ADD_ITEM_TO_ORDER}`;

  const result = await fetchGraphQL(
    {
      query,
      variables: { productVariantId, qty: quantity },
    },
    {
      req, // para forwardear Cookie de la request
    }
  );

  if (result.errors) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const setCookies = result.setCookies ?? [];
  const res = NextResponse.json(result.data);
  // Propagamos cookies de sesión de Vendure -> navegador
  for (const c of setCookies) res.headers.append('Set-Cookie', c);

  return res;
}
