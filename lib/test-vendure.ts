/**
 * Test function to verify Vendure connection
 */

const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

export async function testVendureConnection() {
  try {
    console.log('Testing Vendure connection at:', VENDURE_SHOP_API);
    
    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query TestConnection {
            products {
              totalItems
              items {
                id
                name
                slug
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Vendure connection test result:', result);
    
    return {
      success: true,
      data: result,
      productCount: result.data?.products?.totalItems || 0
    };
  } catch (error) {
    console.error('Vendure connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
