import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { AUTH_STATE_QUERY } from '@/lib/graphql/queries';
import { forwardCookies } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const authState = await fetchGraphQL({ query: AUTH_STATE_QUERY }, { req });

    const user = authState.data?.me || null;
    const customer = authState.data?.activeCustomer || null;
    const isAuthenticated = !!user;

    const response = NextResponse.json({
      isAuthenticated,
      user,
      customer,
      activeOrder: authState.data?.activeOrder || null,
      ...(authState.errors && { errors: authState.errors }),
    });

    forwardCookies(response, authState);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        isAuthenticated: false,
        user: null,
        customer: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}

