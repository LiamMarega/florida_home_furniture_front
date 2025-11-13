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
 * - collectionId: string (optional) - Collection ID to filter by
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
    const collectionId = searchParams.get('collectionId') || undefined;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Page must be >= 1 and limit between 1-100.' },
        { status: 400 }
      );
    }

    // Calculate skip for Vendure
    const skip = (page - 1) * limit;

    // Parse facetValueIds if present
    const facetValueIds = facetValueIdsParam
      ? facetValueIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    // Helper function to sort products
    const sortProducts = (products: any[], sortType: string) => {
      const sorted = [...products];
      switch (sortType) {
        case 'price-low':
          sorted.sort((a, b) => {
            const priceA = a.price || a.priceWithTax || a.variants?.[0]?.price || 0;
            const priceB = b.price || b.priceWithTax || b.variants?.[0]?.price || 0;
            return priceA - priceB;
          });
          break;
        case 'price-high':
          sorted.sort((a, b) => {
            const priceA = a.price || a.priceWithTax || a.variants?.[0]?.price || 0;
            const priceB = b.price || b.priceWithTax || b.variants?.[0]?.price || 0;
            return priceB - priceA;
          });
          break;
        case 'name-asc':
          sorted.sort((a, b) => (a.productName || a.name).localeCompare(b.productName || b.name));
          break;
        case 'name-desc':
          sorted.sort((a, b) => (b.productName || b.name).localeCompare(a.productName || a.name));
          break;
        case 'newest':
          sorted.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          break;
        case 'featured':
        default:
          // Keep original order from search (which is relevance-based)
          break;
      }
      return sorted;
    };

    // Helper function to create paginated response
    const createPaginatedResponse = (products: any[], totalItems: number, setCookies?: string[]) => {
      const totalPages = Math.ceil(totalItems / limit);
      const paginatedProducts = products.slice(skip, skip + limit);

      const nextResponse = NextResponse.json({
        products: paginatedProducts,
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
      if (setCookies && setCookies.length > 0) {
        setCookies.forEach((cookie) => {
          nextResponse.headers.append('Set-Cookie', cookie);
        });
      }

      return nextResponse;
    };

    // Helper function to fetch search results in batches
    const fetchAllSearchResults = async (searchInput: any) => {
      let allItems: any[] = [];
      let currentSkip = 0;
      const batchSize = 100; // Vendure's max take limit
      let hasMore = true;
      let setCookies: string[] | undefined;
      let totalItems = 0;

      while (hasMore) {
        const batchInput = { ...searchInput, take: batchSize, skip: currentSkip };
        
        console.log(`📦 Fetching search batch: skip=${currentSkip}, take=${batchSize}`);

        const searchResponse = await fetchGraphQL(
          {
            query: SEARCH_PRODUCTS_BY_FACETS,
            variables: { input: batchInput },
          },
          { req }
        );

        if (searchResponse.errors) {
          throw new Error(`Search failed: ${JSON.stringify(searchResponse.errors)}`);
        }

        const batchItems = searchResponse.data?.search?.items || [];
        totalItems = searchResponse.data?.search?.totalItems || 0;

        allItems = allItems.concat(batchItems);
        currentSkip += batchSize;

        // Store cookies from first response
        if (!setCookies && searchResponse.setCookies) {
          setCookies = searchResponse.setCookies;
        }

        // Check if we need to fetch more
        hasMore = currentSkip < totalItems && batchItems.length === batchSize;

        console.log(`   Fetched ${batchItems.length} items (total so far: ${allItems.length}/${totalItems})`);
      }

      return { items: allItems, totalItems, setCookies };
    };

    // If we have facetValueIds OR collectionId, use search query
    if (facetValueIds.length > 0 || collectionId) {
      console.log('🔍 Using Vendure search with filters:', {
        facetValueIds: facetValueIds.length > 0 ? facetValueIds : 'none',
        collectionId: collectionId || 'none',
        search: search || 'none'
      });

      // Build search input
      const searchInput: any = {
        groupByProduct: true, // Group variants by product
      };

      // Add facet filter if provided
      if (facetValueIds.length > 0) {
        searchInput.facetValueIds = facetValueIds;
      }

      // Add collection filter if provided
      if (collectionId) {
        searchInput.collectionId = collectionId;
      }

      // Add text search if provided
      if (search && search.trim()) {
        searchInput.term = search.trim();
      }

      console.log('📋 Search input:', JSON.stringify(searchInput, null, 2));

      // Fetch all search results in batches
      const { items: searchItems, totalItems: searchTotalItems, setCookies } = await fetchAllSearchResults(searchInput);

      console.log(`✅ Total search results: ${searchItems.length} items`);

      if (searchItems.length === 0) {
        return NextResponse.json({
          products: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }

      // Get unique product IDs
      const uniqueProductIds = Array.from(new Set(searchItems.map((item: any) => item.productId)));
      console.log(`📊 Unique product IDs: ${uniqueProductIds.length}`);

      // Fetch full product details with all images and variants
      const fetchProductsInBatches = async (productIds: string[]) => {
        const allProducts: any[] = [];
        const batchSize = 100;
        
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batchIds = productIds.slice(i, i + batchSize);
          
          console.log(`📦 Fetching full products batch ${Math.floor(i / batchSize) + 1}: ${batchIds.length} products`);
          
          const productsResponse = await fetchGraphQL(
            {
              query: GET_PRODUCTS_PAGINATED,
              variables: {
                options: {
                  filter: { id: { in: batchIds } },
                  take: batchSize,
                }
              },
            },
            { req }
          );

          if (productsResponse.errors) {
            throw new Error(`Failed to fetch products: ${JSON.stringify(productsResponse.errors)}`);
          }

          const batchProducts = productsResponse.data?.products?.items || [];
          allProducts.push(...batchProducts);
        }

        return allProducts;
      };

      const uniqueProducts = await fetchProductsInBatches(uniqueProductIds);
      console.log(`✅ Fetched full product details: ${uniqueProducts.length} products`);

      // Sort products
      const sortedProducts = sortProducts(uniqueProducts, sort);

      // Apply pagination
      const totalItems = sortedProducts.length;
      console.log(`✅ Returning page ${page} (items ${skip + 1}-${Math.min(skip + limit, totalItems)}) of ${totalItems} products`);

      return createPaginatedResponse(sortedProducts, totalItems, setCookies);
    }

    // Regular product query (no facet or collection filtering - use Vendure's native pagination)
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

    // Add filter object when we have any filters
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
        options.sort = { createdAt: 'DESC' };
        break;
    }

    console.log('📦 Fetching products with native pagination:', JSON.stringify(options, null, 2));

    // Fetch products from Vendure using products query
    const response = await fetchGraphQL(
      {
        query: GET_PRODUCTS_PAGINATED,
        variables: { options },
      },
      { req }
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