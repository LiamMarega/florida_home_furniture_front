import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    console.log('🚪 Logging out user...');
    
    const response = await fetchGraphQL({
      query: LOGOUT_MUTATION,
    }, { req });

    console.log('📦 Logout response:', JSON.stringify(response, null, 2));

    if (response.errors) {
      console.error('❌ Logout errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to logout', details: response.errors },
        { status: 500 }
      );
    }

    console.log('✅ User logged out successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('💥 Error logging out:', error);
    return NextResponse.json(
      { error: 'Failed to logout', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

