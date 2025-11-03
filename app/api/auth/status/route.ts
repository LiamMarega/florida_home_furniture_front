// app/api/auth/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

const AUTH_STATE = /* GraphQL */ `
  query AuthState {
    me {
      id
      identifier
    }
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
    }
    activeOrder {
      id
      code
      state
      total
      lines {
        id
        quantity
        productVariant {
          id
          name
          price
        }
      }
    }
  }
`;

export async function GET(req: NextRequest) {
  try {
    const authState = await fetchGraphQL({ query: AUTH_STATE }, { req });
    
    if (authState.errors) {
      return NextResponse.json(
        { 
          isAuthenticated: false,
          user: null,
          customer: null,
          errors: authState.errors 
        },
        { status: 200 } // Return 200 even with errors, let client handle
      );
    }

    const user = authState.data?.me || null;
    const customer = authState.data?.activeCustomer || null;
    const isAuthenticated = !!user;

    const response = NextResponse.json({
      isAuthenticated,
      user,
      customer,
      activeOrder: authState.data?.activeOrder || null,
    });

    // Forward any cookies from Vendure
    if (authState.setCookies?.length) {
      authState.setCookies.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('[auth/status] Error:', error);
    return NextResponse.json(
      { 
        isAuthenticated: false,
        user: null,
        customer: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 } // Return 200 to allow client to handle gracefully
    );
  }
}

