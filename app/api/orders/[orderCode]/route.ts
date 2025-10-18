import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ORDER_BY_CODE } from '@/lib/graphql/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderCode: string } }
) {
  const { orderCode } = params;

  if (!orderCode) {
    return NextResponse.json(
      { error: 'Order code is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetchGraphQL({
      query: GET_ORDER_BY_CODE,
      variables: { code: orderCode },
    }, {
      req // Pass the request to include cookies
    });

    if (response.errors) {
      return NextResponse.json(
        { error: 'Failed to fetch order', details: response.errors },
        { status: 500 }
      );
    }

    if (!response.data?.orderByCode) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order: response.data.orderByCode });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

