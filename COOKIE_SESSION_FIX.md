# 🍪 Cookie Session Fix - Vendure API Routes

## Problema Resuelto

### Síntoma
La consulta `eligibleShippingMethods` devolvía un array vacío `[]` cuando se llamaba desde las API routes, pero funcionaba correctamente en GraphQL Playground.

```javascript
// ❌ Antes - devolvía vacío
responseeee { data: { eligibleShippingMethods: [] } }

// ✅ Ahora - devuelve los métodos
responseeee { 
  data: { 
    eligibleShippingMethods: [
      {
        id: "1",
        code: "pickup-in-store",
        name: "Pickup in store",
        price: 0,
        priceWithTax: 0
      }
    ] 
  } 
}
```

## Causa Raíz

**Vendure usa cookies de sesión para rastrear las órdenes activas.** Cuando consultas `eligibleShippingMethods` u otras queries relacionadas con la orden activa, Vendure necesita saber:

1. **¿Qué orden estás consultando?** → Identificada por la cookie de sesión
2. **¿Qué cliente está haciendo la consulta?** → También en la cookie

### El Flujo del Problema

```
Usuario → Frontend → API Route → fetchGraphQL → Vendure
          (cookies)   (cookies)    ❌ NO pasaba    (necesita cookies)
                                      las cookies!
```

**En GraphQL Playground funcionaba porque:**
- El navegador automáticamente envía las cookies con cada petición
- GraphQL Playground usa la sesión del navegador

**En las API routes NO funcionaba porque:**
- `fetchGraphQL` hacía una nueva petición fetch sin cookies
- Vendure recibía una petición sin contexto de sesión
- Sin sesión = sin orden activa = array vacío

## Solución Implementada

### 1. Modificar `fetchGraphQL` para aceptar cookies

```typescript
// lib/vendure-server.ts
export async function fetchGraphQL<T = any>(
  request: GraphQLRequest,
  options?: {
    revalidate?: number;
    tags?: string[];
    headers?: Record<string, string>;
    req?: Request; // ✅ Nuevo: Recibe el request para extraer cookies
  }
): Promise<GraphQLResponse<T>> {
  try {
    // ✅ Extraer cookies del request original
    const cookieHeader = options?.req?.headers.get('cookie') || '';
    
    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { 'Cookie': cookieHeader }), // ✅ Pasar cookies
        ...options?.headers,
      },
      body: JSON.stringify(request),
      // ...
    });
```

### 2. Pasar el request en todas las API routes

```typescript
// ❌ Antes
const response = await fetchGraphQL({
  query: GET_ELIGIBLE_SHIPPING_METHODS,
});

// ✅ Ahora
const response = await fetchGraphQL({
  query: GET_ELIGIBLE_SHIPPING_METHODS,
}, {
  req // Pasa el request para incluir cookies
});
```

## Queries que Requieren Cookies de Sesión

Estas queries/mutations **SIEMPRE necesitan cookies** porque trabajan con la orden activa:

### Queries
- ✅ `eligibleShippingMethods` - Métodos de envío para la orden activa
- ✅ `activeOrder` - La orden actual del usuario
- ✅ `orderByCode` - Obtener orden específica (si es del usuario)

### Mutations
- ✅ `setCustomerForOrder` - Establecer cliente en la orden
- ✅ `setOrderShippingAddress` - Establecer dirección de envío
- ✅ `setOrderBillingAddress` - Establecer dirección de facturación
- ✅ `setOrderShippingMethod` - Establecer método de envío
- ✅ `addItemToOrder` - Agregar producto al carrito
- ✅ `adjustOrderLine` - Modificar cantidad
- ✅ `removeOrderLine` - Eliminar línea de orden
- ✅ `addPaymentToOrder` - Agregar pago
- ✅ `createStripePaymentIntent` - Crear Payment Intent

## Archivos Actualizados

### 1. `lib/vendure-server.ts`
```typescript
// Agregado soporte para pasar cookies
options?: {
  req?: Request; // Nuevo parámetro
}
```

### 2. API Routes Actualizadas
- ✅ `/app/api/checkout/shipping-methods/route.ts`
- ✅ `/app/api/checkout/set-customer/route.ts`
- ✅ `/app/api/checkout/set-shipping-address/route.ts`
- ✅ `/app/api/checkout/set-billing-address/route.ts`
- ✅ `/app/api/checkout/set-shipping-method/route.ts`
- ✅ `/app/api/checkout/payment-intent/route.ts`
- ✅ `/app/api/orders/[orderCode]/route.ts`

## Verificar que Funciona

### 1. Revisar las Cookies en DevTools

```
1. Abre Chrome DevTools (F12)
2. Ve a la pestaña "Application"
3. En "Cookies" verás algo como:
   - vendure-session-token
   - vendure-auth-token (si está autenticado)
```

### 2. Probar el Flujo Completo

```bash
# 1. Agrega un producto al carrito
# 2. Ve a /checkout
# 3. Clic en "Load Shipping Methods"
# 4. Deberías ver los métodos disponibles
```

### 3. Verificar en la Consola del Servidor

```bash
# El log ahora debería mostrar métodos:
responseeee { 
  data: { 
    eligibleShippingMethods: [
      { id: "1", name: "Pickup in store", ... }
    ] 
  } 
}
```

## Debugging Tips

Si todavía no funciona, verifica:

### 1. Las cookies se están pasando

```typescript
// Agrega este log en lib/vendure-server.ts
const cookieHeader = options?.req?.headers.get('cookie') || '';
console.log('🍪 Cookies being sent:', cookieHeader);
```

### 2. Vendure está recibiendo las cookies

Revisa los logs de Vendure para ver si la sesión se identifica correctamente.

### 3. La orden está en el estado correcto

```typescript
// En cualquier API route, verifica la orden activa
const activeOrder = await fetchGraphQL({
  query: `query { activeOrder { id state code } }`
}, { req });
console.log('Active Order:', activeOrder);
```

La orden debe estar en estado `AddingItems` o `ArrangingPayment` para que `eligibleShippingMethods` funcione.

## Conceptos Importantes

### ¿Qué son las cookies de sesión?

Las cookies de sesión son pequeños archivos que el navegador guarda y envía automáticamente con cada petición. Vendure las usa para:

1. **Identificar al usuario** sin requerir login en cada petición
2. **Rastrear el carrito/orden activa** del usuario
3. **Mantener el estado** entre peticiones

### ¿Por qué Next.js API routes no las pasan automáticamente?

Cuando haces `fetch()` en el servidor (API routes), **no estás en un navegador**, así que:
- No hay cookies automáticas
- Tienes que pasar manualmente las cookies del request original
- Esto es intencional por seguridad

### Flujo Correcto de Cookies

```
Browser                  Next.js API Route         Vendure
  │                            │                      │
  ├─ GET /api/... ────────────>│                      │
  │  Cookie: session=abc123    │                      │
  │                            │                      │
  │                            ├─ POST /shop-api ────>│
  │                            │  Cookie: session=abc123
  │                            │                      │
  │                            │<───── Response ──────┤
  │<────── Response ───────────┤                      │
```

## Alternativas Consideradas

### ❌ Opción 1: Usar fetch directo con cookies en cada API route
**Por qué no:** Repetir código en cada endpoint, difícil de mantener

### ❌ Opción 2: Usar middleware global para pasar cookies
**Por qué no:** Complica el flujo, y no todas las queries necesitan cookies

### ✅ Opción 3: Modificar `fetchGraphQL` para aceptar request opcional
**Por qué sí:** 
- Centralizado en un solo lugar
- Backward compatible (request es opcional)
- Fácil de usar: solo pasa `{ req }` cuando necesitas cookies

## Best Practices

### 1. Siempre Pasa `req` en Checkout APIs
```typescript
// Todas estas necesitan cookies
await fetchGraphQL({ query: ... }, { req });
```

### 2. No Es Necesario para Queries Públicas
```typescript
// Estas NO necesitan cookies
await fetchGraphQL({ 
  query: GET_PRODUCTS 
}); // No pases req aquí
```

### 3. Log las Cookies en Desarrollo
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('🍪 Cookie header:', req.headers.get('cookie'));
}
```

## Resumen

- ✅ **Problema:** `eligibleShippingMethods` devolvía array vacío
- ✅ **Causa:** No se pasaban cookies de sesión a Vendure
- ✅ **Solución:** Modificar `fetchGraphQL` para aceptar y pasar cookies
- ✅ **Resultado:** Todas las queries relacionadas con la orden activa ahora funcionan

---

**Última actualización:** Octubre 2025  
**Estado:** ✅ Resuelto y documentado

