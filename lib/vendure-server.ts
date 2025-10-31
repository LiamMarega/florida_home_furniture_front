/**
 * Vendure Server-side utilities for Next.js Server Components
 * Optimized for SSR/ISR with native fetch
 */

const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    extensions: any;
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  setCookies?: string[]; // Add setCookies to response
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

/**
 * Server-side GraphQL fetch with error handling and cookie management
 */
export async function fetchGraphQL<T = any>(
  request: GraphQLRequest,
  options?: {
    revalidate?: number;
    tags?: string[];
    headers?: Record<string, string>;
    req?: Request; // Add NextRequest to pass cookies
    cookie?: string; // Direct cookie override for cookie jar pattern
  }
): Promise<GraphQLResponse<T>> {
  try {
    // Priority: direct cookie > req cookies > headers
    const cookieHeader = options?.cookie 
      || options?.req?.headers.get('cookie') 
      || options?.headers?.['Cookie'] 
      || '';
    
    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { 'Cookie': cookieHeader }), // Pass cookies
        ...options?.headers,
      },
      body: JSON.stringify(request),
      credentials: 'include', // Always include credentials
      next: {
        revalidate: options?.revalidate,
        tags: options?.tags,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP ${response.status} error from Vendure:`, errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        return { 
          errors: errorJson.errors || [{ 
            message: `HTTP ${response.status}: ${errorJson.message || errorText}` 
          }] 
        };
      } catch {
        return { 
          errors: [{ 
            message: `HTTP ${response.status}: ${errorText || 'Unknown error'}`,
            extensions: {}
          }] 
        };
      }
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
    }

    // Capture Set-Cookie headers from Vendure response
    const setCookies = response.headers.getSetCookie?.() || [];
    if (setCookies.length > 0) {
      result.setCookies = setCookies;
    }

    return result;
  } catch (error) {
    console.error('GraphQL fetch error:', error);
    return { 
      errors: [{ 
        message: error instanceof Error ? error.message : 'Failed to fetch data',
        extensions: {}
      }] 
    };
  }
}



