import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { LOGOUT } from '@/lib/graphql/mutations';
import { Success } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    console.log('🚪 Logging out user...');
    
    const response = await fetchGraphQL<{ logout: Success }>({
      query: LOGOUT,
    }, { req });

    console.log('📦 Logout response:', JSON.stringify(response, null, 2));

    if (response.errors) {
      console.error('❌ Logout errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to logout', details: response.errors },
        { status: 500 }
      );
    }

    const logoutResult = response.data?.logout;
    if (!logoutResult?.success) {
      console.error('❌ Logout failed:', logoutResult);
      return NextResponse.json(
        { error: 'Logout failed', details: logoutResult },
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

