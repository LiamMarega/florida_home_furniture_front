# Integración Next.js ↔ Vendure

Esta documentación describe la implementación completa de la integración entre Next.js y Vendure siguiendo las mejores prácticas.

## 🏗️ Arquitectura

### Server Components (SSR/ISR)
- **Archivo**: `lib/vendure-server.ts`
- **Uso**: Para páginas públicas, catálogos, productos
- **Ventajas**: Mejor SEO, performance, caching automático
- **Ejemplo**: Página de productos, colecciones, búsquedas

### Route Handlers (API Routes)
- **Archivos**: `app/api/cart/*/route.ts`
- **Uso**: Para mutaciones de carrito, autenticación
- **Ventajas**: Manejo seguro de cookies, validación server-side
- **Ejemplo**: Agregar/quitar productos del carrito

### Client Context
- **Archivo**: `contexts/cart-context.tsx`
- **Uso**: Estado global del carrito en el cliente
- **Ventajas**: Reactividad, optimistic updates, error handling

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env.local` basado en `env.example`:

```bash
# Vendure Configuration
VENDURE_SHOP_API_URL=http://localhost:3000/shop-api
VENDURE_ADMIN_API_URL=http://localhost:3000/admin-api

# Next.js Configuration
NEXT_PUBLIC_VENDURE_API_URL=http://localhost:3000/shop-api
```

### Endpoints Vendure

Por defecto, Vendure expone:
- **Shop API**: `http://localhost:3000/shop-api`
- **Admin API**: `http://localhost:3000/admin-api`

## 📦 Componentes

### CartProvider
```tsx
import { CartProvider } from '@/contexts/cart-context';

export default function RootLayout({ children }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
```

### AddToCartButton
```tsx
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

<AddToCartButton
  productVariantId="variant-id"
  productName="Product Name"
  disabled={!inStock}
/>
```

### MiniCart
```tsx
import { MiniCart } from '@/components/cart/mini-cart';

<MiniCart />
```

## 🛒 Funcionalidades del Carrito

### Agregar Producto
```tsx
const { addItem } = useCart();
await addItem(productVariantId, quantity);
```

### Actualizar Cantidad
```tsx
const { updateQuantity } = useCart();
await updateQuantity(orderLineId, newQuantity);
```

### Remover Producto
```tsx
const { removeItem } = useCart();
await removeItem(orderLineId);
```

### Vaciar Carrito
```tsx
const { clearCart } = useCart();
await clearCart();
```

## 🔄 Flujo de Datos

### 1. Server Components
```
Browser → Next.js Server → Vendure API → Response → HTML
```

### 2. Cart Operations
```
Browser → Next.js API Route → Vendure API → Response → Context Update
```

### 3. Session Management
```
Vendure Cookie → Next.js Middleware → API Routes → Vendure API
```

## 🚀 Ejemplos de Uso

### Página de Productos (Server Component)
```tsx
import { getProducts } from '@/lib/vendure-server';

export default async function ProductsPage() {
  const result = await getProducts({ take: 12, revalidate: 60 });
  const products = result.data?.products?.items || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Producto Individual
```tsx
import { getProductBySlug } from '@/lib/vendure-server';

export default async function ProductPage({ params }) {
  const result = await getProductBySlug(params.slug);
  const product = result.data?.product;

  if (!product) {
    return <div>Producto no encontrado</div>;
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton
        productVariantId={product.variants[0].id}
        productName={product.name}
      />
    </div>
  );
}
```

## 🔐 Autenticación

### Registro de Cliente
```tsx
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailAddress: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  }),
});
```

### Login
```tsx
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user@example.com',
    password: 'password',
  }),
});
```

## 💳 Pagos

### Stripe (Recomendado)
1. Instala el plugin oficial de Stripe en Vendure
2. Configura las claves en Vendure
3. El frontend solo necesita iniciar el flujo de pago

### Mercado Pago (Personalizado)
1. Crea un `PaymentMethodHandler` en Vendure
2. Implementa webhooks para confirmar pagos
3. Maneja el flujo en el frontend

## 🌍 Multi-idioma y Monedas

### Configuración de Canal
```tsx
// En queries GraphQL
const query = `
  query GetProducts($languageCode: LanguageCode) {
    products(languageCode: $languageCode) {
      items {
        name
        description
      }
    }
  }
`;
```

### Headers de Idioma
```tsx
// En middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('vendure-language-code', 'es');
  return response;
}
```

## 📊 Performance

### ISR (Incremental Static Regeneration)
```tsx
// Para catálogos que cambian poco
const result = await getProducts({ revalidate: 3600 }); // 1 hora

// Para productos individuales
const result = await getProductBySlug(slug, 300); // 5 minutos
```

### Caching
```tsx
// Tags para invalidación selectiva
const result = await getProductBySlug(slug, 300, [`product-${slug}`]);
```

## 🐛 Debugging

### Logs de GraphQL
```tsx
// En vendure-server.ts
if (result.errors) {
  console.error('GraphQL errors:', result.errors);
}
```

### Estado del Carrito
```tsx
const { order, isLoading, error } = useCart();
console.log('Cart state:', { order, isLoading, error });
```

## 🔧 Troubleshooting

### Cookies no se envían
- Verifica que el dominio sea el mismo
- Usa `credentials: 'include'` en fetch
- Revisa el middleware de cookies

### Errores de CORS
- Configura CORS en Vendure
- Usa el middleware de Next.js para headers

### Productos no cargan
- Verifica la URL de la API
- Revisa los logs de Vendure
- Confirma que el canal esté activo

## 📚 Recursos Adicionales

- [Documentación de Vendure](https://docs.vendure.io/)
- [GraphQL Intro](https://docs.vendure.io/guides/getting-started/graphql-intro/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [GraphQL Request](https://github.com/jasonkuhrt/graphql-request)
