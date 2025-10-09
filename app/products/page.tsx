import { getAllProducts } from '@/lib/vendure-server';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
}

export default async function ProductsPage() {
  const result = await getAllProducts(60);
  
  if (result.errors) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error al cargar productos
          </h1>
          <p className="text-gray-600">
            {result.errors[0]?.message || 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  const products: Product[] = result.data?.products?.items || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Nuestros Productos
        </h1>
        <p className="text-gray-600">
          Descubre nuestra selección de productos de alta calidad
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              <div className="relative aspect-square overflow-hidden rounded-t-lg">
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Sin imagen</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4">
              <CardTitle className="text-lg mb-2 line-clamp-2">
                <Link 
                  href={`/products/${product.slug}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {product.name}
                </Link>
              </CardTitle>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                Producto disponible - Haz clic para ver más detalles
              </p>

              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-gray-900">
                  Ver detalles
                </div>
                
                <Badge variant="secondary" className="text-blue-600 bg-blue-50">
                  Disponible
                </Badge>
              </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0">
              <Link 
                href={`/products/${product.slug}`}
                className="w-full"
              >
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  Ver Producto
                </button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No se encontraron productos
          </h2>
          <p className="text-gray-600">
            Intenta con otros filtros o vuelve más tarde
          </p>
        </div>
      )}
    </div>
  );
}
