# Error Handling Improvements

## Problema Identificado

El error `ALREADY_LOGGED_IN_ERROR` de Vendure no estaba siendo capturado correctamente porque:

1. **El código solo verificaba `__typename === 'ErrorResult'`** pero el error tenía la estructura:
   ```json
   {
     "errorCode": "ALREADY_LOGGED_IN_ERROR",
     "message": "Cannot set a Customer for the Order when already logged in"
   }
   ```

2. **Status code incorrecto**: Se devolvía `200 OK` en lugar de un código de error apropiado (400 o 500).

3. **Falta de logs consistentes**: Algunos archivos tenían logs, otros no.

## Mejoras Implementadas

### 1. Detección Dual de Errores

Ahora se verifican **DOS condiciones** para detectar errores de Vendure:

```typescript
// Verifica por __typename (método tradicional)
if (result?.__typename && result.__typename !== 'Order') {
  // Retorna error 400
}

// Verifica por errorCode (nuevo método)
if (result?.errorCode) {
  // Retorna error 400
}
```

### 2. Respuesta de Error Mejorada

Las respuestas de error ahora incluyen:
- `error`: Mensaje legible para el usuario
- `errorCode`: Código de error de Vendure para debugging
- `details`: Objeto completo del error
- **Status HTTP correcto**: 400 para errores del cliente, 500 para errores del servidor

```typescript
return NextResponse.json(
  { 
    error: result.message || 'Failed to set customer',
    errorCode: result.errorCode,
    details: result
  },
  { status: 400 }
);
```

### 3. Validación de Respuesta

Se agregó validación para asegurar que se recibió una orden válida:

```typescript
// Verify we have a valid order
if (!result || !result.id) {
  console.error('❌ Invalid response: No order returned');
  return NextResponse.json(
    { error: 'Invalid response from server' },
    { status: 500 }
  );
}
```

### 4. Logs Consistentes

Todos los archivos ahora tienen logs consistentes con emojis para facilitar el debugging:

- 🚀 **Inicio de operación**
- 📍 **Configuración de dirección**
- 👤 **Configuración de cliente**
- 🚚 **Métodos de envío**
- 💳 **Procesamiento de pago**
- 🍪 **Cookies/sesión**
- 📦 **Respuesta de Vendure**
- ✅ **Operación exitosa**
- ❌ **Error identificado**
- 💥 **Error crítico/excepción**

### 5. Tipos de Error por Status Code

- **400 Bad Request**: Errores de validación de Vendure (errorCode presente)
- **500 Internal Server Error**: Errores de GraphQL o del servidor

## Archivos Actualizados

✅ `/app/api/checkout/set-customer/route.ts`
✅ `/app/api/checkout/set-shipping-address/route.ts`
✅ `/app/api/checkout/set-billing-address/route.ts`
✅ `/app/api/checkout/set-shipping-method/route.ts`
✅ `/app/api/checkout/shipping-methods/route.ts`
✅ `/app/api/checkout/payment-intent/route.ts`

## Ejemplo de Error Capturado

**Antes:**
```json
{
  "order": {
    "errorCode": "ALREADY_LOGGED_IN_ERROR",
    "message": "Cannot set a Customer for the Order when already logged in"
  }
}
// Status: 200 OK ❌
```

**Después:**
```json
{
  "error": "Cannot set a Customer for the Order when already logged in",
  "errorCode": "ALREADY_LOGGED_IN_ERROR",
  "details": {
    "errorCode": "ALREADY_LOGGED_IN_ERROR",
    "message": "Cannot set a Customer for the Order when already logged in"
  }
}
// Status: 400 Bad Request ✅
```

## Errores Comunes de Vendure Ahora Manejados

- `ALREADY_LOGGED_IN_ERROR`: Usuario ya autenticado
- `EMAIL_ADDRESS_CONFLICT_ERROR`: Email ya en uso
- `INSUFFICIENT_STOCK_ERROR`: Stock insuficiente
- `ORDER_STATE_TRANSITION_ERROR`: Estado de orden inválido
- `PAYMENT_FAILED_ERROR`: Fallo en el pago
- Y cualquier otro error que Vendure devuelva con `errorCode`

## Testing

Para probar el manejo de errores mejorado:

1. **Test ALREADY_LOGGED_IN_ERROR (SOLUCIONADO)**: 
   - ✅ **ANTES**: Inicia sesión en Vendure → Intenta checkout como guest → Error 400
   - ✅ **AHORA**: Inicia sesión en Vendure → Intenta checkout → Retorna orden actual sin error

2. **Test de respuesta inválida**:
   - Simula una respuesta sin `id` de orden
   - Debe recibir error 500

3. **Test de GraphQL errors**:
   - Simula un error de red o GraphQL
   - Debe recibir error 500 con detalles

4. **Test de usuario ya autenticado**:
   - Usuario logueado intenta hacer checkout
   - Debe retornar orden actual con mensaje "User already authenticated"

## Solución Implementada para ALREADY_LOGGED_IN_ERROR

### Problema Original
```typescript
// Siempre intentaba establecer cliente, causando error si ya había usuario logueado
const response = await fetchGraphQL({
  query: SET_CUSTOMER_FOR_ORDER,
  // ...
});
```

### Solución Implementada
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

### Flujo Mejorado
1. **Usuario anónimo**: Establece cliente → Continúa checkout
2. **Usuario logueado**: Retorna orden actual → Continúa checkout
3. **Error de verificación**: Continúa con flujo normal (fallback)

## Beneficios

✅ **Debugging más fácil**: Logs consistentes y detallados
✅ **Status codes correctos**: Frontend puede manejar errores apropiadamente
✅ **Mensajes claros**: El usuario ve mensajes de error útiles
✅ **Captura completa**: No se escapan errores de Vendure
✅ **Mantenibilidad**: Código consistente en todas las rutas
✅ **Prevención de errores**: Verifica estado antes de operaciones
✅ **Compatibilidad**: Funciona para usuarios logueados y anónimos

