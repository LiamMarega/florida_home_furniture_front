import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GraphQL query to get collections
 */
const GET_COLLECTIONS_QUERY = `
  query GetCollections($options: CollectionListOptions) {
    collections(options: $options) {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        productVariants {
          totalItems
        }
      }
      totalItems
    }
  }
`;

/**
 * GET /api/products/get-collections
 * 
 * Returns collections from Vendure with optional limit
 * Query params:
 *   - limit: number of collections to return (default: all)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    console.log(`🔍 Fetching collections${limit ? ` (limit: ${limit})` : ''}`);

    // Fetch collections from Vendure
    const collectionsResponse = await fetchGraphQL(
      {
        query: GET_COLLECTIONS_QUERY,
        variables: {
          options: limit ? { take: limit } : undefined,
        },
      },
      {
        req,
      }
    );

    if (collectionsResponse.errors) {
      console.error('❌ GraphQL errors fetching collections:', collectionsResponse.errors);
      return NextResponse.json(
        { error: 'Failed to fetch collections', details: collectionsResponse.errors },
        { status: 500 }
      );
    }

    const collections = collectionsResponse.data?.collections?.items || [];
    console.log(`📦 Found ${collections.length} collections`);

    // Filter out root collection and format the data
    const formattedCollections = collections
      .filter((collection: any) => collection.slug !== '__root_collection__')
      .map((collection: any) => ({
        id: collection.id,
        title: collection.name,
        slug: collection.slug,
        description: collection.description || '',
        image: collection.featuredAsset?.preview || '',
        productCount: collection.productVariants?.totalItems || 0,
        href: `/collections/${collection.slug}`,
      }));

    console.log(`✅ Returning ${formattedCollections.length} formatted collections`);

    const nextResponse = NextResponse.json({
      collections: formattedCollections,
      totalItems: collectionsResponse.data?.collections?.totalItems || 0,
    });

    // Forward Set-Cookie headers from Vendure if present
    if (collectionsResponse.setCookies && collectionsResponse.setCookies.length > 0) {
      collectionsResponse.setCookies.forEach((cookie) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error fetching collections:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch collections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

