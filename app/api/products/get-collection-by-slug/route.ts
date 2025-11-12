import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_COLLECTION_BY_SLUG } from '@/lib/graphql/queries';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/products/get-collection-by-slug?slug={slug}
 * 
 * Returns collection information by slug
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

    console.log(`🔍 Fetching collection with slug: ${slug}`);

    // Fetch collection from Vendure
    const collectionResponse = await fetchGraphQL(
      {
        query: GET_COLLECTION_BY_SLUG,
        variables: {
          slug,
        },
      },
      {
        req,
      }
    );

    if (collectionResponse.errors) {
      console.error('❌ GraphQL errors fetching collection:', collectionResponse.errors);
      return NextResponse.json(
        { error: 'Failed to fetch collection', details: collectionResponse.errors },
        { status: 500 }
      );
    }

    const collection = collectionResponse.data?.collection;

    if (!collection) {
      console.warn(`⚠️ Collection not found for slug: ${slug}`);
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found collection: ${collection.name}`);

    const nextResponse = NextResponse.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      image: collection.featuredAsset?.preview || '',
      productCount: collection.productVariants?.totalItems || 0,
    });

    // Forward Set-Cookie headers from Vendure if present
    if (collectionResponse.setCookies && collectionResponse.setCookies.length > 0) {
      collectionResponse.setCookies.forEach((cookie) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching collection by slug:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

