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
 * GET /api/products/get-category-by-slug?slug={slug}
 * 
 * Returns the facetValueId for a category slug
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // Fetch all facets to find the "Category" facet
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
    
    // Find the "Category" facet (case-insensitive)
    const categoryFacet = facets.find(
      (facet: any) => facet.code?.toLowerCase() === 'category' || facet.name?.toLowerCase() === 'category'
    );

    if (!categoryFacet) {
      return NextResponse.json(
        { error: 'Category facet not found' },
        { status: 404 }
      );
    }

    // Find the category value by slug (code)
    const categoryValue = categoryFacet.values?.find(
      (value: any) => value.code?.toLowerCase() === slug.toLowerCase()
    );

    if (!categoryValue) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const nextResponse = NextResponse.json({
      id: categoryValue.id,
      name: categoryValue.name,
      code: categoryValue.code,
    });

    // Forward Set-Cookie headers from Vendure if present
    if (facetsResponse.setCookies && facetsResponse.setCookies.length > 0) {
      facetsResponse.setCookies.forEach((cookie) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching category by slug:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch category',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

