/**
 * Vendure Server-side utilities for Next.js Server Components
 * Optimized for SSR/ISR with native fetch
 */

const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

/**
 * Server-side GraphQL fetch with error handling
 */
export async function fetchGraphQL<T = any>(
  request: GraphQLRequest,
  options?: {
    revalidate?: number;
    tags?: string[];
    headers?: Record<string, string>;
  }
): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(request),
      next: {
        revalidate: options?.revalidate,
        tags: options?.tags,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('GraphQL fetch error:', error);
    return { errors: [{ message: 'Failed to fetch data' }] };
  }
}

/**
 * Get products with pagination and filtering
 */
export async function getProducts(options?: {
  take?: number;
  skip?: number;
  sort?: { name?: string; price?: string };
  filter?: { facetValueIds?: string[] };
  revalidate?: number;
}) {
  const query = `
    query GetProducts($options: ProductListOptions) {
      products(options: $options) {
        totalItems
        items {
          id
          name
          slug
          description
          featuredAsset {
            id
            preview
            source
            width
            height
          }
          assets {
            id
            preview
            source
            width
            height
          }
          variants {
            id
            name
            sku
            price
            priceWithTax
            currencyCode
            stockLevel
          }
          facetValues {
            id
            name
            facet {
              id
              name
            }
          }
        }
      }
    }
  `;

  return fetchGraphQL(
    {
      query,
      variables: {
        options: {
          take: options?.take || 12,
          skip: options?.skip || 0,
          sort: options?.sort,
          filter: options?.filter,
        },
      },
    },
    { revalidate: options?.revalidate || 60 }
  );
}

/**
 * Get product by slug
 */
export async function getProductBySlug(slug: string, revalidate = 300) {
  const query = `
    query GetProductBySlug($slug: String!) {
      product(slug: $slug) {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
          source
          width
          height
        }
        assets {
          id
          preview
          source
          width
          height
        }
        variants {
          id
          name
          sku
          price
          priceWithTax
          currencyCode
          stockLevel
        }
        facetValues {
          id
          name
          facet {
            id
            name
          }
        }
      }
    }
  `;

  return fetchGraphQL(
    { query, variables: { slug } },
    { revalidate, tags: [`product-${slug}`] }
  );
}

/**
 * Search products
 */
export async function searchProducts(input: {
  term?: string;
  take?: number;
  skip?: number;
  sort?: { name?: string; price?: string };
  facetValueIds?: string[];
  revalidate?: number;
}) {
  const query = `
    query SearchProducts($input: SearchInput!) {
      search(input: $input) {
        totalItems
        items {
          productId
          productName
          slug
          description
          priceWithTax {
            ... on PriceRange {
              min
              max
            }
            ... on SinglePrice {
              value
            }
          }
          currencyCode
          productAsset {
            id
            preview
            source
            width
            height
          }
        }
      }
    }
  `;

  return fetchGraphQL(
    {
      query,
      variables: {
        input: {
          term: input.term,
          take: input.take || 12,
          skip: input.skip || 0,
          sort: input.sort,
          facetValueIds: input.facetValueIds,
        },
      },
    },
    { revalidate: input.revalidate || 60 }
  );
}

/**
 * Get collections
 */
export async function getCollections(options?: {
  take?: number;
  skip?: number;
  revalidate?: number;
}) {
  const query = `
    query GetCollections($options: CollectionListOptions) {
      collections(options: $options) {
        totalItems
        items {
          id
          name
          slug
          description
          featuredAsset {
            id
            preview
            source
            width
            height
          }
        }
      }
    }
  `;

  return fetchGraphQL(
    {
      query,
      variables: {
        options: {
          take: options?.take || 20,
          skip: options?.skip || 0,
        },
      },
    },
    { revalidate: options?.revalidate || 300 }
  );
}

/**
 * Get collection by slug with products
 */
export async function getCollectionBySlug(
  slug: string,
  options?: {
    take?: number;
    skip?: number;
    revalidate?: number;
  }
) {
  const query = `
    query GetCollectionBySlug($slug: String!, $options: ProductListOptions) {
      collection(slug: $slug) {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
          source
          width
          height
        }
        productVariants(options: $options) {
          totalItems
          items {
            id
            name
            sku
            price
            priceWithTax
            currencyCode
            product {
              id
              name
              slug
              description
              featuredAsset {
                id
                preview
                source
                width
                height
              }
            }
          }
        }
      }
    }
  `;

  return fetchGraphQL(
    {
      query,
      variables: {
        slug,
        options: {
          take: options?.take || 12,
          skip: options?.skip || 0,
        },
      },
    },
    { revalidate: options?.revalidate || 300, tags: [`collection-${slug}`] }
  );
}

/**
 * Get all products (simple version with just id, name, slug)
 */
export async function getAllProducts(revalidate = 60) {
  const query = `
    query GetAllProducts {
      products {
        items {
          id
          name
          slug
        }
        totalItems
      }
    }
  `;

  return fetchGraphQL(
    { query },
    { revalidate, tags: ['all-products'] }
  );
}
