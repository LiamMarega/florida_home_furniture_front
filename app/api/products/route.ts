import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_PRODUCTS_PAGINATED, SEARCH_PRODUCTS_BY_FACETS, GET_PRODUCTS_BY_IDS } from '@/lib/graphql/queries';

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
 *   Filters products at the PRODUCT level, not variant level. Products with facets are returned
 *   even if their variants don't have the facet assigned.
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

    // If filtering by collectionId, use search query with collection filter
    if (collectionId) {
      const searchInput: any = {
        take: 1000, // Get a large number to ensure we get all products
        skip: 0,
        groupByProduct: true, // Group variants by product
        collectionId: collectionId,
      };

      // Add text search if provided
      if (search && search.trim()) {
        searchInput.term = search.trim();
      }

      console.log('🔍 Searching products in collection:', JSON.stringify(searchInput, null, 2));

      const searchResponse = await fetchGraphQL(
        {
          query: SEARCH_PRODUCTS_BY_FACETS,
          variables: { input: searchInput },
        },
        {
          req,
        }
      );

      if (searchResponse.errors) {
        console.error('❌ GraphQL errors in search:', searchResponse.errors);
        return NextResponse.json(
          { error: 'Failed to search products', details: searchResponse.errors },
          { status: 500 }
        );
      }

      // Get unique product IDs from search results
      const searchItems = searchResponse.data?.search?.items || [];
      const productIds = Array.from(new Set(searchItems.map((item: any) => item.productId)));
      
      console.log(`📋 Found ${productIds.length} unique product IDs in collection`);

      if (productIds.length === 0) {
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

      // Fetch full products by IDs
      const productOptions: any = {
        take: productIds.length, // Get all products
        skip: 0,
        filter: {
          id: { in: productIds }
        }
      };

      // Add search filter if provided (for name search)
      if (search && search.trim()) {
        productOptions.filter.name = {
          contains: search.trim()
        };
      }

      const productsResponse = await fetchGraphQL(
        {
          query: GET_PRODUCTS_BY_IDS,
          variables: { 
            options: productOptions 
          },
        },
        {
          req,
        }
      );

      if (productsResponse.errors) {
        console.error('❌ GraphQL errors fetching products:', productsResponse.errors);
        return NextResponse.json(
          { error: 'Failed to fetch products', details: productsResponse.errors },
          { status: 500 }
        );
      }

      const allProducts = productsResponse.data?.products?.items || [];
      
      // Apply sorting
      let sortedProducts = [...allProducts];
      switch (sort) {
        case 'price-low':
          sortedProducts.sort((a, b) => {
            const priceA = a.variants?.[0]?.price || 0;
            const priceB = b.variants?.[0]?.price || 0;
            return priceA - priceB;
          });
          break;
        case 'price-high':
          sortedProducts.sort((a, b) => {
            const priceA = a.variants?.[0]?.price || 0;
            const priceB = b.variants?.[0]?.price || 0;
            return priceB - priceA;
          });
          break;
        case 'name-asc':
          sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'newest':
          sortedProducts.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          break;
        case 'featured':
        default:
          sortedProducts.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          break;
      }

      // Apply pagination
      const totalItems = sortedProducts.length;
      const totalPages = Math.ceil(totalItems / limit);
      const paginatedProducts = sortedProducts.slice(skip, skip + limit);

      console.log(`✅ Returning ${paginatedProducts.length} products from collection (page ${page}/${totalPages}, total: ${totalItems})`);

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
      if (productsResponse.setCookies && productsResponse.setCookies.length > 0) {
        productsResponse.setCookies.forEach((cookie) => {
          nextResponse.headers.append('Set-Cookie', cookie);
        });
      }

      return nextResponse;
    }

    // If filtering by facetValueIds, use a hybrid approach:
    // 1. Use search to get product IDs (may include products with facet in variants)
    // 2. Fetch full products by IDs
    // 3. Filter to only include products with facet at PRODUCT level
    if (facetValueIdsParam) {
      const facetValueIds = facetValueIdsParam.split(',').map(id => id.trim()).filter(Boolean);
      
      if (facetValueIds.length > 0) {
        // Step 1: Use search to get product IDs (with groupByProduct to get unique products)
        const searchInput: any = {
          take: 1000, // Get a large number to ensure we get all products
          skip: 0,
          groupByProduct: true, // Group variants by product
          facetValueIds: facetValueIds,
        };

        // Add text search if provided
        if (search && search.trim()) {
          searchInput.term = search.trim();
        }

        console.log('🔍 Searching products with facets to get product IDs:', JSON.stringify(searchInput, null, 2));

        const searchResponse = await fetchGraphQL(
          {
            query: SEARCH_PRODUCTS_BY_FACETS,
            variables: { input: searchInput },
          },
          {
            req,
          }
        );

        if (searchResponse.errors) {
          console.error('❌ GraphQL errors in search:', searchResponse.errors);
          return NextResponse.json(
            { error: 'Failed to search products', details: searchResponse.errors },
            { status: 500 }
          );
        }

        // Get unique product IDs from search results
        const searchItems = searchResponse.data?.search?.items || [];
        const productIds = Array.from(new Set(searchItems.map((item: any) => item.productId)));
        
        console.log(`📋 Found ${productIds.length} unique product IDs from search`);

        if (productIds.length === 0) {
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

        // Step 2: Fetch full products by IDs
        const productOptions: any = {
          take: productIds.length, // Get all products
          skip: 0,
          filter: {
            id: { in: productIds }
          }
        };

        // Add search filter if provided (for name search)
        if (search && search.trim()) {
          productOptions.filter.name = {
            contains: search.trim()
          };
        }

        const productsResponse = await fetchGraphQL(
          {
            query: GET_PRODUCTS_BY_IDS,
            variables: { 
              options: productOptions 
            },
          },
          {
            req,
          }
        );

        if (productsResponse.errors) {
          console.error('❌ GraphQL errors fetching products:', productsResponse.errors);
          return NextResponse.json(
            { error: 'Failed to fetch products', details: productsResponse.errors },
            { status: 500 }
          );
        }

        // Step 3: Filter products to only include those with facet at PRODUCT level
        const allProducts = productsResponse.data?.products?.items || [];
        const productsWithFacet = allProducts.filter((product: any) => {
          const productFacetValueIds = (product.facetValues || []).map((fv: any) => fv.id);
          return facetValueIds.some((facetValueId: string) => productFacetValueIds.includes(facetValueId));
        });

        console.log(`✅ Filtered to ${productsWithFacet.length} products with facet at product level (from ${allProducts.length} total)`);

        // Step 4: Apply sorting
        let sortedProducts = [...productsWithFacet];
        switch (sort) {
          case 'price-low':
            sortedProducts.sort((a, b) => {
              const priceA = a.variants?.[0]?.price || 0;
              const priceB = b.variants?.[0]?.price || 0;
              return priceA - priceB;
            });
            break;
          case 'price-high':
            sortedProducts.sort((a, b) => {
              const priceA = a.variants?.[0]?.price || 0;
              const priceB = b.variants?.[0]?.price || 0;
              return priceB - priceA;
            });
            break;
          case 'name-asc':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'name-desc':
            sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
            break;
          case 'newest':
            sortedProducts.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            });
            break;
          case 'featured':
          default:
            sortedProducts.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            });
            break;
        }

        // Step 5: Apply pagination
        const totalItems = sortedProducts.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginatedProducts = sortedProducts.slice(skip, skip + limit);

        console.log(`✅ Returning ${paginatedProducts.length} products (page ${page}/${totalPages}, total: ${totalItems})`);

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
        if (productsResponse.setCookies && productsResponse.setCookies.length > 0) {
          productsResponse.setCookies.forEach((cookie) => {
            nextResponse.headers.append('Set-Cookie', cookie);
          });
        }

        return nextResponse;
      }
    }

    // Regular product query (no facet filtering)
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

