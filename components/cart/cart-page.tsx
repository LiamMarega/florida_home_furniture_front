'use client';

import { useCart } from '@/contexts/cart-context';
import { CartItem } from './cart-item';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function CartPage() {
  const { items, itemCount, total, order, clearCart, isUpdating, isLoading } = useCart();

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success('Carrito vaciado');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Error al vaciar carrito');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-24 w-24 mx-auto mb-6 text-gray-300" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Tu carrito está vacío
        </h2>
        <p className="text-gray-600 mb-8">
          Explora nuestros productos y agrega algo especial a tu carrito
        </p>
        <Button asChild>
          <Link href="/">
            Continuar comprando
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Carrito ({itemCount} {itemCount === 1 ? 'producto' : 'productos'})
        </h1>
        <Button
          variant="outline"
          onClick={handleClearCart}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Vaciar carrito
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Resumen del pedido</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>
                  {order && formatPrice(order.total, order.currencyCode)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos:</span>
                <span>
                  {order && formatPrice(order.totalWithTax - order.total, order.currencyCode)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>
                    {order && formatPrice(order.totalWithTax, order.currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">
                  Proceder al pago
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Continuar comprando
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
