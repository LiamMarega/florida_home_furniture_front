# Fix para ALREADY_LOGGED_IN_ERROR

## Problema
El error `ALREADY_LOGGED_IN_ERROR` ocurría cuando un usuario ya autenticado intentaba hacer checkout, porque el sistema intentaba establecer un cliente para la orden cuando ya había uno asociado.

## Solución Implementada

### 1. Backend - API Route (`set-customer/route.ts`)

**Antes:**
```typescript
// Siempre intentaba establecer cliente
const response = await fetchGraphQL({
  query: SET_CUSTOMER_FOR_ORDER,
  // ...
});
```

**Después:**
```typescript
// 1. Verificar si ya hay usuario logueado
const activeOrderCheck = await fetchGraphQL({
  query: GET_ACTIVE_ORDER,
}, { req });

// 2. Si ya hay cliente, retornar orden actual
if (activeOrder?.customer?.id) {
  return NextResponse.json({ 
    order: activeOrder,
    message: 'User already authenticated',
    customer: activeOrder.customer
  });
}

// 3. Solo establecer cliente si no hay uno existente
const response = await fetchGraphQL({
  query: SET_CUSTOMER_FOR_ORDER,
  // ...
});
```

### 2. Frontend - Checkout Page (`checkout/page.tsx`)

**Antes:**
```typescript
// Siempre llamaba a set-customer
const customerRes = await fetch('/api/checkout/set-customer', {
  // ...
});
```

**Después:**
```typescript
// 1. Verificar si ya hay usuario logueado
const orderCheckRes = await fetch('/api/cart/active', { method: 'GET' });
const orderCheckData = await orderCheckRes.json();

// 2. Solo establecer cliente si no hay uno existente
if (orderCheckData.activeOrder?.customer?.id) {
  console.log('✅ User already logged in, skipping customer setup');
} else {
  const customerRes = await fetch('/api/checkout/set-customer', {
    // ...
  });
}
```

## Flujo Mejorado

### Usuario Anónimo (Guest)
1. ✅ Establece dirección de envío
2. ✅ Establece cliente para la orden
3. ✅ Continúa con checkout

### Usuario Logueado
1. ✅ Establece dirección de envío
2. ✅ **Detecta usuario existente** → Salta establecimiento de cliente
3. ✅ Continúa con checkout

## Logs de Debugging

Se agregaron logs detallados para facilitar el debugging:

```typescript
console.log('🔍 Checking if user is already authenticated...');
console.log('🔍 Active order check response:', JSON.stringify(activeOrderCheck, null, 2));
console.log('🔍 Active order found:', !!activeOrder);
console.log('🔍 Active order customer:', activeOrder?.customer);
console.log('🔍 Customer ID:', activeOrder?.customer?.id);
console.log('🔍 Customer email:', activeOrder?.customer?.emailAddress);
```

## Beneficios

✅ **Previene el error**: No intenta establecer cliente si ya hay uno
✅ **Doble verificación**: Backend y frontend verifican el estado
✅ **Logs detallados**: Fácil debugging de problemas
✅ **Compatibilidad**: Funciona para usuarios logueados y anónimos
✅ **Eficiencia**: Evita llamadas innecesarias a la API

## Testing

### Test 1: Usuario Anónimo
1. Abrir checkout sin estar logueado
2. Llenar formulario de cliente
3. ✅ Debe establecer cliente correctamente

### Test 2: Usuario Logueado
1. Iniciar sesión en Vendure
2. Ir a checkout
3. ✅ Debe detectar usuario existente y saltar establecimiento de cliente

### Test 3: Verificar Logs
1. Revisar consola del navegador
2. ✅ Debe mostrar "User already logged in, skipping customer setup"

## Archivos Modificados

- `app/api/checkout/set-customer/route.ts` - Verificación en backend
- `app/checkout/page.tsx` - Verificación en frontend

## Resultado

El error `ALREADY_LOGGED_IN_ERROR` ya no debería ocurrir, y el checkout debería funcionar correctamente tanto para usuarios logueados como anónimos.
