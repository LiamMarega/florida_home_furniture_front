import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { UserProfile } from '@/app/profile/types';

// GET - Fetch user profile
export async function GET(req: NextRequest) {
  try {
    const result = await fetchGraphQL(
      { query: GET_ACTIVE_CUSTOMER },
      { req }
    );

    if (result.errors) {
      const isUnauthorized = result.errors.some(
        (e) => e.extensions?.code === 'FORBIDDEN' || e.message?.includes('not currently authorized')
      );

      if (isUnauthorized) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch profile', details: result.errors },
        { status: 500 }
      );
    }

    const customer = result.data?.activeCustomer;
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const profile: UserProfile = {
      id: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      emailAddress: customer.emailAddress,
    };

    const response = NextResponse.json({ profile });
    
    // Forward cookies if present
    if (result.setCookies) {
      result.setCookies.forEach((cookie) => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

