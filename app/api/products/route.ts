import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_PRODUCTS_PAGINATED, SEARCH_PRODUCTS_BY_FACETS } from '@/lib/graphql/queries';

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
 * - facetValueIds: string (optional) - Comma-separated list of facet value IDs to filter by
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
    const facetValueIdsParam = searchParams.get('facetValueIds');

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Page must be >= 1 and limit between 1-100.' },
        { status: 400 }
      );
    }

    // Calculate skip for Vendure
    const skip = (page - 1) * limit;

    // If filtering by facetValueIds, use search query instead of products query
    if (facetValueIdsParam) {
      const facetValueIds = facetValueIdsParam.split(',').map(id => id.trim()).filter(Boolean);
      
      if (facetValueIds.length > 0) {
        // Build SearchInput for Vendure search query
        const searchInput: any = {
          take: limit,
          skip: skip,
          groupByProduct: true, // Group variants by product
        };

        // Add text search if provided
        if (search && search.trim()) {
          searchInput.term = search.trim();
        }

        // Add facetValueIds filter
        searchInput.facetValueIds = facetValueIds;

        // Add sorting - SearchInput uses different sort fields
        switch (sort) {
          case 'price-low':
            searchInput.sort = { price: 'ASC' };
            break;
          case 'price-high':
            searchInput.sort = { price: 'DESC' };
            break;
          case 'name-asc':
            searchInput.sort = { name: 'ASC' };
            break;
          case 'name-desc':
            searchInput.sort = { name: 'DESC' };
            break;
          case 'newest':
            searchInput.sort = { createdAt: 'DESC' };
            break;
          case 'featured':
          default:
            // Default: sort by relevance (no sort specified means default relevance)
            break;
        }

        console.log('🔍 Searching products with facets:', JSON.stringify(searchInput, null, 2));

        // Use search query for facet filtering
        const response = await fetchGraphQL(
          {
            query: SEARCH_PRODUCTS_BY_FACETS,
            variables: { input: searchInput },
          },
          {
            req,
          }
        );

        if (response.errors) {
          console.error('❌ GraphQL errors:', response.errors);
          return NextResponse.json(
            { error: 'Failed to search products', details: response.errors },
            { status: 500 }
          );
        }

        // Transform search results to match Product format
        const searchResults = response.data?.search?.items || [];
        const totalItems = response.data?.search?.totalItems || 0;
        const totalPages = Math.ceil(totalItems / limit);

        // Transform search results to Product format
        const products = searchResults.map((item: any) => ({
          id: item.productId,
          name: item.productName,
          slug: item.slug,
          description: item.description || '',
          enabled: true,
          featuredAsset: item.productAsset ? {
            id: item.productAsset.id,
            preview: item.productAsset.preview,
            source: item.productAsset.preview, // Use preview as source for compatibility
            focalPoint: item.productAsset.focalPoint,
          } : undefined,
          variants: [{
            id: item.productVariantId,
            name: item.productVariantName,
            price: typeof item.priceWithTax === 'object' && 'value' in item.priceWithTax 
              ? item.priceWithTax.value 
              : typeof item.priceWithTax === 'object' && 'min' in item.priceWithTax
              ? item.priceWithTax.min
              : 0,
            priceWithTax: typeof item.priceWithTax === 'object' && 'value' in item.priceWithTax 
              ? item.priceWithTax.value 
              : typeof item.priceWithTax === 'object' && 'min' in item.priceWithTax
              ? item.priceWithTax.min
              : 0,
            currencyCode: item.currencyCode,
          }],
          collections: [],
        }));

        console.log(`✅ Found ${products.length} products (page ${page}/${totalPages}, total: ${totalItems})`);

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

        if (response.setCookies && response.setCookies.length > 0) {
          response.setCookies.forEach((cookie) => {
            nextResponse.headers.append('Set-Cookie', cookie);
          });
        }

        return nextResponse;
      }
    }

    // Build Vendure ProductListOptions for regular product query
    const options: any = {
      take: limit,
      skip: skip,
    };

    // Build filter object
    const filter: any = {};

    // Add search filter if provided
    if (search && search.trim()) {
      filter.name = {
        contains: search.trim()
      };
    }

    // Always add filter object when we have any filters
    if (Object.keys(filter).length > 0) {
      options.filter = filter;
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

    // Fetch products from Vendure using products query
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

