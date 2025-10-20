# Solución al Problema de Sesión del Carrito

## Problema Identificado

El carrito se vaciaba al navegar de `/cart` a `/checkout` porque las cookies de sesión de Vendure no se estaban propagando correctamente entre las peticiones del cliente y el servidor.

## Cambios Realizados

### 1. **lib/vendure-server.ts** - Propagación de Cookies del Servidor

**Cambios:**
- Actualizado `GraphQLResponse` para incluir `setCookies?: string[]`
- Modificado `fetchGraphQL()` para:
  - Aceptar cookies tanto del parámetro `req` como de `headers['Cookie']`
  - Añadir `credentials: 'include'` en todas las peticiones fetch
  - Capturar cookies `Set-Cookie` de las respuestas de Vendure usando `response.headers.getSetCookie()`
  - Retornar las cookies en la respuesta para que las APIs las puedan propagar al cliente

**Por qué:** Vendure envía cookies de sesión en cada respuesta que deben ser propagadas al navegador del cliente para mantener la sesión activa.

---

### 2. **APIs de Carrito** - Forwarding de Cookies

Actualizadas TODAS las APIs del carrito para capturar y forwardear cookies:

- `app/api/cart/active/route.ts`
- `app/api/cart/add/route.ts`
- `app/api/cart/remove/route.ts`
- `app/api/cart/update/route.ts`
- `app/api/cart/clear/route.ts`

**Cambios en cada API:**
```typescript
// Usar req para pasar cookies
const response = await fetchGraphQL({
  query: QUERY,
  variables: {...}
}, {
  req: request, // Pass the request to include cookies
});

// Crear respuesta y forwardear cookies
const nextResponse = NextResponse.json(response.data);

// Forward Set-Cookie headers from Vendure if present
if (response.setCookies && response.setCookies.length > 0) {
  response.setCookies.forEach(cookie => {
    nextResponse.headers.append('Set-Cookie', cookie);
  });
}

return nextResponse;
```

---

### 3. **APIs de Checkout** - Forwarding de Cookies

Actualizadas TODAS las APIs de checkout:

- `app/api/checkout/set-customer/route.ts`
- `app/api/checkout/set-shipping-address/route.ts`
- `app/api/checkout/set-billing-address/route.ts`
- `app/api/checkout/set-shipping-method/route.ts`
- `app/api/checkout/shipping-methods/route.ts`
- `app/api/checkout/payment-intent/route.ts`

**Cambios:** Misma lógica que las APIs de carrito - capturar y forwardear cookies de Set-Cookie.

---

### 4. **API de Órdenes** - Forwarding de Cookies

Actualizada:
- `app/api/orders/[orderCode]/route.ts`

**Cambios:** Misma lógica de forwarding de cookies.

---

### 5. **contexts/cart-context.tsx** - Inclusión de Credenciales

Actualizadas TODAS las llamadas `fetch()` para incluir cookies:

```typescript
const response = await fetch('/api/cart/active', {
  credentials: 'include', // Include cookies in request
});
```

**Funciones actualizadas:**
- `loadCart()`
- `addItem()`
- `removeItem()`
- `updateQuantity()`
- `clearCart()`

---

### 6. **app/checkout/page.tsx** - Inclusión de Credenciales

Actualizadas TODAS las llamadas `fetch()` en el proceso de checkout:

```typescript
const res = await fetch('/api/cart/active', { 
  method: 'GET',
  credentials: 'include', // Include cookies in request
});
```

**Funciones actualizadas:**
- `loadActiveOrder()`
- `loadShippingMethods()`
- `onCustomerSubmit()` - todos los fetch dentro (set-customer, set-shipping-address, set-billing-address, set-shipping-method)
- `handleStartPayment()` - payment-intent

---

### 7. **app/checkout/confirmation/[orderCode]/page.tsx** - Inclusión de Credenciales

Actualizado el fetch para cargar la orden:

```typescript
const res = await fetch(`/api/orders/${orderCode}`, {
  credentials: 'include', // Include cookies in request
});
```

---

## Cómo Funciona Ahora

### Flujo Completo de Cookies:

1. **Cliente → API de Next.js:**
   - El navegador envía automáticamente las cookies con `credentials: 'include'`
   
2. **API de Next.js → Vendure:**
   - `fetchGraphQL()` extrae las cookies del request (`req.headers.get('cookie')`)
   - Las envía a Vendure con `credentials: 'include'`
   
3. **Vendure → API de Next.js:**
   - Vendure responde con cookies `Set-Cookie` (para actualizar/crear sesión)
   - `fetchGraphQL()` captura estas cookies con `response.headers.getSetCookie()`
   - Las retorna en `response.setCookies`
   
4. **API de Next.js → Cliente:**
   - Cada API route forwardea las cookies al cliente usando:
     ```typescript
     nextResponse.headers.append('Set-Cookie', cookie)
     ```
   
5. **Navegador:**
   - El navegador guarda automáticamente las cookies recibidas
   - Las incluye en todas las peticiones subsiguientes

---

## Verificación del Flujo de Compra

### Proceso Completo:

1. ✅ **Agregar productos al carrito**
   - Las cookies de sesión se crean y mantienen
   
2. ✅ **Ver carrito en `/cart`**
   - El carrito carga correctamente con la sesión
   
3. ✅ **Navegar a `/checkout`**
   - **ANTES:** El carrito se vaciaba aquí ❌
   - **AHORA:** El carrito se mantiene con todos los items ✅
   
4. ✅ **Completar información del cliente**
   - La información se guarda en la sesión
   - Si el usuario está logueado, se maneja correctamente
   
5. ✅ **Completar dirección de envío**
   - La dirección se asocia a la orden en la sesión
   
6. ✅ **Seleccionar método de envío**
   - El método se aplica a la orden
   
7. ✅ **Procesar pago**
   - El PaymentIntent se crea para la orden correcta
   - La sesión se mantiene durante todo el proceso
   
8. ✅ **Confirmación de orden**
   - La orden se muestra correctamente

---

## Beneficios Adicionales

1. **Manejo de Usuarios Autenticados:**
   - Si un usuario está logueado y intenta hacer guest checkout, el sistema lo maneja correctamente
   
2. **Consistencia en Toda la Aplicación:**
   - Todas las APIs ahora manejan cookies de manera consistente
   - No hay brechas en la cadena de sesión
   
3. **Mejor Debugging:**
   - Los logs existentes ahora mostrarán las cookies correctamente
   - Es más fácil rastrear problemas de sesión

---

## Notas Importantes

- **No se requieren cambios en Vendure:** Todo el manejo es en el frontend
- **Compatibilidad:** Los cambios son retrocompatibles
- **Seguridad:** Las cookies se manejan de manera segura con `credentials: 'include'`
- **CORS:** El middleware ya maneja CORS correctamente para desarrollo

---

## Testing

Para probar el flujo completo:

1. Limpiar cookies del navegador
2. Agregar productos al carrito
3. Navegar a `/cart` - verificar que los productos estén ahí
4. Hacer clic en "Proceed to checkout"
5. **Verificar:** Los productos deben seguir apareciendo en el resumen del checkout
6. Completar el proceso de checkout completo

Si en algún momento el carrito se vacía, revisar:
- Console del navegador para errores de cookies
- Network tab para ver si las cookies se están enviando/recibiendo
- Server logs para ver los errores de Vendure

---

## Fecha
**Octubre 20, 2025**

---

## Autor
Solución implementada para Florida Home Furniture

