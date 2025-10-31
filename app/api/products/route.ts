import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_PRODUCTS_PAGINATED } from '@/lib/graphql/queries';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 * 
 * Query params:
 * - page: number (default: 1) - Current page number
 * - limit: number (default: 20) - Items per page
 * - search: string (optional) - Search term for product name/description
 * - sort: string (optional) - Sort field and direction (e.g., 'name-asc', 'price-low')
 * 
 * Returns paginated products from Vendure
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || 'featured';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Page must be >= 1 and limit between 1-100.' },
        { status: 400 }
      );
    }

    // Calculate skip for Vendure
    const skip = (page - 1) * limit;

    // Build Vendure ProductListOptions
    const options: any = {
      take: limit,
      skip: skip,
    };

    // Add search filter if provided
    if (search && search.trim()) {
      options.filter = {
        name: {
          contains: search.trim()
        }
      };
    }

    // Add sorting
    switch (sort) {
      case 'price-low':
        options.sort = { price: 'ASC' };
        break;
      case 'price-high':
        options.sort = { price: 'DESC' };
        break;
      case 'name-asc':
        options.sort = { name: 'ASC' };
        break;
      case 'name-desc':
        options.sort = { name: 'DESC' };
        break;
      case 'newest':
        options.sort = { createdAt: 'DESC' };
        break;
      case 'featured':
      default:
        // Default sorting - you can customize this
        options.sort = { createdAt: 'DESC' };
        break;
    }

    console.log('📦 Fetching products with options:', JSON.stringify(options, null, 2));

    // Fetch products from Vendure
    const response = await fetchGraphQL(
      {
        query: GET_PRODUCTS_PAGINATED,
        variables: { options },
      },
      {
        req, // Pass the request to include cookies if needed
      }
    );

    // Handle GraphQL errors
    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: response.errors },
        { status: 500 }
      );
    }

    const products = response.data?.products?.items || [];
    const totalItems = response.data?.products?.totalItems || 0;
    const totalPages = Math.ceil(totalItems / limit);

    console.log(`✅ Fetched ${products.length} products (page ${page}/${totalPages}, total: ${totalItems})`);

    // Create response with pagination metadata
    const nextResponse = NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

    // Forward Set-Cookie headers from Vendure if present
    if (response.setCookies && response.setCookies.length > 0) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

