# Stripe + Vendure Integration Guide

## Setup Completo

### 1. Configuración de Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Vendure Configuration
VENDURE_SHOP_API_URL=http://localhost:3000/shop-api
VENDURE_ADMIN_API_URL=http://localhost:3000/admin-api

# Next.js Configuration  
NEXT_PUBLIC_VENDURE_API_URL=http://localhost:3000/shop-api
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
```

### 2. Configuración del Webhook de Stripe (Desarrollo Local)

El webhook ya está escuchando. Asegúrate de tener el Stripe CLI corriendo:

```bash
stripe listen --forward-to localhost:3000/payments/stripe
```

Este comando:
- Escucha eventos de Stripe
- Los reenvía a tu servidor Vendure local
- Muestra un webhook signing secret que debes configurar en Vendure

### 3. Configuración en Vendure Admin

1. Accede al panel de administración de Vendure: `http://localhost:3000/admin`
2. Ve a **Settings → Payment Methods**
3. Crea un nuevo método de pago:
   - **Name**: Stripe
   - **Code**: stripe-payment-method
   - **Handler**: Stripe payments
   - **API Key**: Tu clave secreta de Stripe
   - **Webhook Secret**: El secret proporcionado por `stripe listen`

### 4. Configuración del StripePlugin en Vendure

Asegúrate de que tu `vendure-config.ts` incluya:

```typescript
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';

export const config: VendureConfig = {
  // ...
  plugins: [
    StripePlugin.init({
      // Esto previene que diferentes clientes usen el mismo PaymentIntent
      storeCustomersInStripe: true,
    }),
  ],
};
```

## Flujo de Checkout Completo

### Paso 1: Información del Cliente

1. Usuario completa el formulario con:
   - Nombre y apellido
   - Email
   - Dirección de envío
   - Método de envío

2. El sistema:
   - Verifica si el usuario ya está autenticado
   - Si NO está autenticado, crea un nuevo customer en Vendure
   - Si YA está autenticado, usa el customer existente
   - Establece la dirección de envío
   - Establece el método de envío

### Paso 2: Pago

1. Sistema crea un Payment Intent en Stripe vía mutation:
   ```graphql
   mutation CreateStripePaymentIntent($orderCode: String!) {
     createStripePaymentIntent(orderCode: $orderCode)
   }
   ```

2. Recibe un `clientSecret` que se usa para inicializar Stripe Elements

3. Usuario ingresa información de pago en el formulario de Stripe

4. Al hacer clic en "Complete Payment":
   - Stripe valida el pago
   - Si es exitoso, redirige a: `/checkout/confirmation/[orderCode]?payment_intent=pi_xxx&redirect_status=succeeded`
   - Si falla, muestra error en el formulario

### Paso 3: Webhook Processing

Después de que Stripe procesa el pago:

1. Stripe envía evento `payment_intent.succeeded` al webhook
2. El webhook de Vendure:
   - Verifica la firma del webhook
   - Actualiza el estado del pago en la orden
   - Transiciona la orden al estado correspondiente
   - Envía email de confirmación (si está configurado)

### Paso 4: Confirmación

La página de confirmación:
- Carga la orden desde Vendure
- Verifica el estado del pago
- Muestra el estado apropiado (éxito, pendiente, o fallido)
- Si está pendiente, hace polling cada 3 segundos por 30 segundos

## Validación de Usuarios

El sistema previene la duplicación de usuarios con múltiples capas de verificación:

### En el API Route `set-customer`

```typescript
// Primera capa: Verificar activeCustomer
const activeCustomerCheck = await fetchGraphQL({
  query: GET_ACTIVE_CUSTOMER,
}, { req });

const activeCustomer = activeCustomerCheck.data?.activeCustomer;

if (activeCustomer?.id) {
  console.log('✅ User already logged in (activeCustomer found)');
  const activeOrderCheck = await fetchGraphQL({
    query: GET_ACTIVE_ORDER,
  }, { req });
  
  return NextResponse.json({ 
    order: activeOrderCheck.data?.activeOrder,
    message: 'User already authenticated',
    customer: activeCustomer,
    alreadyLoggedIn: true
  });
}

// Segunda capa: Verificar si la orden ya tiene customer
const activeOrderCheck = await fetchGraphQL({
  query: GET_ACTIVE_ORDER,
}, { req });

if (activeOrderCheck.data?.activeOrder?.customer?.id) {
  console.log('✅ Order already has customer assigned');
  return NextResponse.json({ 
    order: activeOrderCheck.data.activeOrder,
    message: 'Customer already assigned to order',
    customer: activeOrderCheck.data.activeOrder.customer,
    alreadyLoggedIn: true
  });
}

// Tercera capa: Manejar error ALREADY_LOGGED_IN_ERROR
const response = await fetchGraphQL({
  query: SET_CUSTOMER_FOR_ORDER,
  variables: { input: { firstName, lastName, emailAddress } }
}, { req });

const result = response.data?.setCustomerForOrder;

// Si Vendure dice que ya está autenticado, tratarlo como éxito
if (result?.errorCode === 'ALREADY_LOGGED_IN_ERROR') {
  console.log('✅ User already logged in (detected via error)');
  const currentOrderCheck = await fetchGraphQL({
    query: GET_ACTIVE_ORDER,
  }, { req });
  
  return NextResponse.json({ 
    order: currentOrderCheck.data?.activeOrder,
    message: 'User already authenticated',
    customer: currentOrderCheck.data?.activeOrder.customer,
    alreadyLoggedIn: true
  });
}
```

### En el Frontend

```typescript
// El API maneja toda la lógica, simplemente llamamos
const customerRes = await fetch('/api/checkout/set-customer', {
  method: 'POST',
  body: JSON.stringify({ firstName, lastName, emailAddress })
});

const customerData = await customerRes.json();

if (customerData.alreadyLoggedIn) {
  console.log('✅ User already logged in, continuing with existing customer');
} else {
  console.log('✅ Customer set successfully');
}
```

## Manejo de Sesiones

El sistema usa cookies para mantener la sesión:

1. Vendure crea una cookie de sesión al crear la orden
2. Todos los API routes pasan las cookies:
   ```typescript
   const cookieHeader = req.headers.get('cookie') || '';
   
   await fetchGraphQL({
     query: SOME_QUERY,
   }, {
     headers: { 'Cookie': cookieHeader }
   });
   ```

3. La misma sesión se mantiene a través de todo el checkout

## Testing

### Tarjetas de Prueba de Stripe

- **Éxito**: `4242 4242 4242 4242`
- **Requiere 3DS**: `4000 0025 0000 3155`
- **Declinada**: `4000 0000 0000 9995`
- **Insuficientes fondos**: `4000 0000 0000 9995`

Usa cualquier fecha futura para expiración y cualquier CVC de 3 dígitos.

### Flujo de Prueba Completo

1. **Inicia el backend de Vendure**:
   ```bash
   cd vendure-backend
   npm run dev
   ```

2. **Inicia Stripe CLI**:
   ```bash
   stripe listen --forward-to localhost:3000/payments/stripe
   ```

3. **Inicia el frontend**:
   ```bash
   npm run dev
   ```

4. **Prueba el flujo**:
   - Agrega productos al carrito
   - Ve a checkout: `http://localhost:3001/checkout`
   - Completa información de cliente
   - Usa tarjeta de prueba: `4242 4242 4242 4242`
   - Completa el pago
   - Verifica la página de confirmación
   - Revisa los logs de Stripe CLI para ver el webhook

### Logs a Revisar

**En la consola del navegador**:
```
🚀 Starting checkout submission...
📍 Setting shipping address...
✅ Shipping address set successfully
👤 Setting customer...
✅ Customer set successfully
🚚 Setting shipping method...
✅ Shipping method set successfully
💳 Starting payment flow...
💳 Creating payment intent for order: ABC123
✅ Client secret received, navigating to payment step
💳 Confirming payment...
```

**En el terminal del frontend (API routes)**:
```
📝 Creating payment intent for order: ABC123
🔍 Order check: {...}
✅ Order validation passed, creating payment intent...
📦 Vendure response: {...}
✅ Payment intent created successfully
```

**En el terminal de Stripe CLI**:
```
[200] POST /payments/stripe [evt_xxx]
payment_intent.succeeded [evt_xxx]
```

**En el terminal de Vendure**:
```
[Stripe] Processing payment intent: pi_xxx
[Stripe] Payment succeeded for order: ABC123
[Order] Transitioning order ABC123 to PaymentSettled
```

## Troubleshooting

### Problema: "No client secret returned"

**Causa**: El StripePlugin no está configurado correctamente en Vendure

**Solución**:
1. Verifica que `@vendure/payments-plugin` esté instalado en Vendure
2. Verifica que `StripePlugin` esté en la configuración
3. Verifica que el payment method esté creado en el admin

### Problema: "Order incomplete"

**Causa**: Faltan campos requeridos en la orden

**Solución**:
1. Verifica que se haya establecido el customer
2. Verifica que se haya establecido la dirección de envío
3. Verifica que se haya establecido el método de envío

### Problema: Webhook no procesa el pago

**Causa**: El webhook secret no es correcto o Stripe CLI no está corriendo

**Solución**:
1. Verifica que `stripe listen` esté corriendo
2. Copia el webhook secret del terminal
3. Actualiza el payment method en Vendure admin con el nuevo secret

### Problema: "Cannot set a Customer for the Order when already logged in" (ALREADY_LOGGED_IN_ERROR)

**Causa**: Se está intentando asignar un customer a una orden cuando ya hay un usuario autenticado en la sesión, pero la orden no tiene customer asociado (estado inconsistente)

**Solución**:
- **✅ YA ESTÁ RESUELTO** - El código ahora maneja este error automáticamente en 4 capas:
  1. Verifica `activeCustomer` antes de intentar crear customer
  2. Verifica si la orden ya tiene customer asignado
  3. Si Vendure devuelve `ALREADY_LOGGED_IN_ERROR`:
     - Transiciona la orden a `ArrangingPayment` para forzar asociación del customer
     - Verifica que el customer se haya asociado
  4. Si sigue sin customer después de la transición:
     - Hace logout de la sesión conflictiva
     - Reintenta `setCustomerForOrder` como guest checkout
- El flujo continúa normalmente con el customer correctamente asociado

**Logs esperados cuando esto ocurre**:
```
🔍 Checking if user is already authenticated...
✅ User already logged in (detected via error)
🔄 Transitioning order to ArrangingPayment to associate customer...
✅ Order updated with customer: { id: '...', email: '...' }
```

O si necesita logout:
```
❌ Customer still null after transition
🔄 Attempting logout and retry...
✅ Logged out, now retrying setCustomerForOrder...
✅ Customer set successfully after logout
```

**Por qué ocurre**:
Este problema sucede cuando hay una sesión de autenticación "huérfana" - el usuario se autenticó previamente pero Vendure no asoció automáticamente ese usuario con la nueva orden. La solución fuerza la asociación o limpia la sesión para empezar fresco.

### Problema: Redirect después del pago no funciona

**Causa**: `NEXT_PUBLIC_SITE_URL` no está configurada

**Solución**:
1. Agrega `NEXT_PUBLIC_SITE_URL=http://localhost:3001` a `.env.local`
2. Reinicia el servidor de desarrollo
3. El código tiene fallback a `window.location.origin` si falla

## Archivos Clave

- **Checkout Page**: `app/checkout/page.tsx`
- **Confirmation Page**: `app/checkout/confirmation/[orderCode]/page.tsx`
- **Payment Intent API**: `app/api/checkout/payment-intent/route.ts`
- **Set Customer API**: `app/api/checkout/set-customer/route.ts`
- **Set Shipping Address API**: `app/api/checkout/set-shipping-address/route.ts`
- **Set Shipping Method API**: `app/api/checkout/set-shipping-method/route.ts`
- **GraphQL Mutations**: `lib/graphql/mutations.ts`
- **GraphQL Queries**: `lib/graphql/queries.ts`

## Mejoras Implementadas

1. ✅ Validación de usuario existente antes de crear customer
2. ✅ Mejor manejo de errores en todos los pasos
3. ✅ Logging detallado para debugging
4. ✅ Polling en página de confirmación para pagos pendientes
5. ✅ Fallback para NEXT_PUBLIC_SITE_URL
6. ✅ Verificación de order code en payment intent
7. ✅ Manejo robusto de sesiones con cookies
8. ✅ Validación completa de orden antes de crear payment intent

## Siguiente Paso

Ejecuta la aplicación y prueba el flujo completo de checkout con las tarjetas de prueba de Stripe.

