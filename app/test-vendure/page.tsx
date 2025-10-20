import { testVendureConnection } from '@/lib/test-vendure';

export default async function TestVendurePage() {
  const result = await testVendureConnection();

  return (
    <div className="min-h-screen bg-white pt-32 pb-16 px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Vendure Connection Test</h1>
        
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.success ? '✅ Connected Successfully' : '❌ Connection Failed'}
          </div>
        </div>

        {result.success ? (
          <div className="bg-green-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Products Found</h2>
            <p className="text-lg">Total products: <strong>{result.productCount}</strong></p>
            
            {result.productCount > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Sample Products:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.data?.data?.products?.items?.slice(0, 5).map((product: any) => (
                    <li key={product.id}>
                      <strong>{product.name}</strong> (slug: {product.slug})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Error Details</h2>
            <p className="text-red-800">{result.error}</p>
          </div>
        )}

        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Make sure Vendure server is running on <code>http://localhost:3000/shop-api</code></li>
            <li>Check that you have products in your Vendure database</li>
            <li>Verify the VENDURE_SHOP_API_URL environment variable</li>
            <li>If using a different port, update the environment variable</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
