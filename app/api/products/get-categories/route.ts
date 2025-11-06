import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GraphQL query to get facets
 */
const GET_FACETS_QUERY = `
  query GetFacets {
    facets {
      items {
        id
        name
        code
        values {
          id
          name
          code
        }
      }
    }
  }
`;

/**
 * GraphQL query to count products by facet value
 */
const COUNT_PRODUCTS_BY_FACET_VALUE = `
  query CountProductsByFacetValue($facetValueIds: [ID!]!) {
    products(options: { 
      filter: { 
        facetValueIds: $facetValueIds 
      },
      take: 1
    }) {
      totalItems
    }
  }
`;

/**
 * GET /api/products/get-categories
 * 
 * Returns the top 6 categories (facet values) from the "Category" facet,
 * sorted by the number of products in each category.
 */
export async function GET(req: NextRequest) {
  try {
    // Step 1: Fetch all facets to find the "Category" facet
    const facetsResponse = await fetchGraphQL(
      {
        query: GET_FACETS_QUERY,
      },
      {
        req,
      }
    );

    if (facetsResponse.errors) {
      console.error('❌ GraphQL errors fetching facets:', facetsResponse.errors);
      return NextResponse.json(
        { error: 'Failed to fetch facets', details: facetsResponse.errors },
        { status: 500 }
      );
    }

    const facets = facetsResponse.data?.facets?.items || [];
    
    console.log('📋 Available facets:', facets.map((f: any) => ({ code: f.code, name: f.name, valuesCount: f.values?.length || 0 })));
    
    // Find the "Category" facet (case-insensitive)
    const categoryFacet = facets.find(
      (facet: any) => facet.code?.toLowerCase() === 'category' || facet.name?.toLowerCase() === 'category'
    );

    if (!categoryFacet) {
      console.warn('⚠️ Category facet not found. Available facets:', facets.map((f: any) => ({ code: f.code, name: f.name })));
      return NextResponse.json(
        { error: 'Category facet not found', categories: [] },
        { status: 404 }
      );
    }

    const categoryValues = categoryFacet.values || [];
    console.log(`📦 Found ${categoryValues.length} category values`);

    if (categoryValues.length === 0) {
      console.warn('⚠️ Category facet has no values');
      return NextResponse.json({ categories: [] });
    }

    // Step 2: Count products for each category facet value
    console.log('🔍 Starting to count products for each category...');
    const categoriesWithCounts = await Promise.all(
      categoryValues.map(async (categoryValue: any) => {
        try {
          console.log(`  🔎 Counting products for category: ${categoryValue.name} (ID: ${categoryValue.id})`);
          
          const countResponse = await fetchGraphQL(
            {
              query: COUNT_PRODUCTS_BY_FACET_VALUE,
              variables: {
                facetValueIds: [categoryValue.id],
              },
            },
            {
              req,
            }
          );

          if (countResponse.errors) {
            console.error(`❌ Error counting products for ${categoryValue.name}:`, JSON.stringify(countResponse.errors, null, 2));
            return {
              id: categoryValue.id,
              name: categoryValue.name,
              code: categoryValue.code,
              productCount: 0,
            };
          }

          const productCount = countResponse.data?.products?.totalItems ?? 0;
          console.log(`  ✓ ${categoryValue.name}: ${productCount} products (Response: ${JSON.stringify(countResponse.data)})`);

          return {
            id: categoryValue.id,
            name: categoryValue.name,
            code: categoryValue.code,
            productCount,
          };
        } catch (error) {
          console.error(`❌ Error processing category ${categoryValue.name}:`, error);
          return {
            id: categoryValue.id,
            name: categoryValue.name,
            code: categoryValue.code,
            productCount: 0,
          };
        }
      })
    );

    console.log('📊 Categories with counts:', categoriesWithCounts.map(c => `${c.name}: ${c.productCount}`).join(', '));

    // Step 3: Sort by product count (descending) and take top 6
    // If no categories have products, return all categories (up to 6) sorted by name
    const hasProducts = categoriesWithCounts.some(cat => cat.productCount > 0);
    
    const topCategories = hasProducts
      ? categoriesWithCounts
          .filter((cat) => cat.productCount > 0) // Only include categories with products
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 6)
      : categoriesWithCounts
          .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically if no products
          .slice(0, 6);

    const formattedCategories = topCategories.map((cat) => ({
      name: cat.name,
      href: `/category/${cat.code}`, // Changed from /collections/ to /category/
      productCount: cat.productCount,
    }));

    console.log(`✅ Returning ${formattedCategories.length} categories`);

    const nextResponse = NextResponse.json({
      categories: formattedCategories,
    });

    // Forward Set-Cookie headers from Vendure if present
    if (facetsResponse.setCookies && facetsResponse.setCookies.length > 0) {
      facetsResponse.setCookies.forEach((cookie) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching categories:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

