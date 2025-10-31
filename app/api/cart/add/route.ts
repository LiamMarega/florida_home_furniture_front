import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_ITEM_TO_ORDER } from '@/lib/graphql/mutations';
import { ORDER_SUMMARY_FRAGMENT } from '@/lib/graphql/fragments';

const ACTIVE_ORDER_STATE = /* GraphQL */ `
  query ActiveOrderState {
    activeOrder {
      id
      code
      state
    }
  }
`;

const TRANSITION_TO_ADDING = /* GraphQL */ `
  mutation BackToAdding {
    transitionOrderToState(state: "AddingItems") {
      __typename
      ... on Order { id code state }
      ... on OrderStateTransitionError { errorCode message transitionError fromState toState }
    }
  }
`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { productVariantId, quantity = 1 } = body as {
    productVariantId: string;
    quantity?: number;
  };

  if (!productVariantId || quantity <= 0) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // 1) Ver el estado actual
  const auth = await fetchGraphQL({ query: ACTIVE_ORDER_STATE }, { req });
  if (auth.errors) {
    return NextResponse.json({ errors: auth.errors }, { status: 400 });
  }
  const state = auth.data?.activeOrder?.state as string | undefined;

  // 2) Si está en ArrangingPayment, intentar volver a AddingItems
  if (state === 'ArrangingPayment') {
    const back = await fetchGraphQL({ query: TRANSITION_TO_ADDING }, { req });
    const t = back.data?.transitionOrderToState;
    if (t?.__typename !== 'Order') {
      // No se pudo volver → devolvés info para que el front reintente/cancele pago
      return NextResponse.json(
        { error: 'ORDER_LOCKED_DURING_PAYMENT', detail: t },
        { status: 409 },
      );
    }
  }

  // 3) Si ya está placed (p.ej. PaymentAuthorized / PaymentSettled), bloquear
  if (state && state !== 'AddingItems' && state !== 'ArrangingPayment') {
    return NextResponse.json(
      {
        error: 'ORDER_ALREADY_PLACED',
        message:
          'La orden ya fue confirmada. Creá una nueva orden para agregar items o usa Order Modification en Admin.',
        state,
      },
      { status: 409 },
    );
  }

  // 4) Agregar item
  const query = `${ORDER_SUMMARY_FRAGMENT}\n${ADD_ITEM_TO_ORDER}`;
  const result = await fetchGraphQL(
    { query, variables: { productVariantId, qty: quantity } },
    { req },
  );

  if (result.errors) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const res = NextResponse.json(result.data);
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}
