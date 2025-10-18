# 💳 Payment Intent Troubleshooting Guide

## Error: "Failed to create payment intent"

Este error ocurre cuando intentas crear un Payment Intent de Stripe pero algo está mal configurado o faltan datos.

## Checklist de Diagnóstico

### 1. ✅ Verificar que Vendure tenga StripePlugin Configurado

El error más común es que **Vendure no tenga el StripePlugin configurado**.

#### Verificar en Vendure:

```typescript
// En tu vendure-config.ts debe estar:
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';

export const config: VendureConfig = {
  plugins: [
    StripePlugin.init({
      // Tu configuración de Stripe
      storeCustomersInStripe: true,
    }),
  ],
};
```

#### Cómo verificar si está instalado:

1. Ve a Vendure Admin: `http://localhost:3000/admin`
2. Ve a Settings → Payment Methods
3. Deberías ver "Stripe" como opción de payment method
4. Si no está, necesitas:
   ```bash
   cd vendure-backend
   npm install @vendure/payments-plugin
   ```

### 2. ✅ Verificar Variables de Entorno de Stripe

Vendure necesita las claves de Stripe configuradas:

```env
# En tu .env de Vendure (NO el frontend)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**IMPORTANTE:** Estas claves van en el backend de Vendure, NO en Next.js.

### 3. ✅ Verificar que la Orden Tenga Todos los Datos

La orden debe tener:
- ✅ Customer (email)
- ✅ Shipping address
- ✅ Shipping method
- ✅ Al menos un item

#### Revisar con los logs mejorados:

Con los cambios que hicimos, ahora verás en consola:

```json
{
  "error": "Order incomplete",
  "details": "Missing required fields: shipping address, shipping method",
  "order": {
    "hasCustomer": true,
    "hasShippingAddress": false,
    "hasShippingMethod": false
  }
}
```

### 4. ✅ Verificar el Estado de la Orden

La orden debe estar en estado `ArrangingPayment` o similar para crear un Payment Intent.

#### Estados válidos:
- ✅ `AddingItems`
- ✅ `ArrangingPayment`
- ❌ `PaymentAuthorized`
- ❌ `PaymentSettled`
- ❌ `Delivered`

#### Verificar el estado:

```bash
# En GraphQL Playground de Vendure
query {
  activeOrder {
    id
    code
    state
    customer { emailAddress }
    shippingAddress { streetLine1 }
    shippingLines {
      shippingMethod { name }
    }
  }
}
```

## Logs Mejorados

Con los cambios implementados, ahora verás logs más detallados:

### ✅ Caso Exitoso:
```
📝 Creating payment intent for order: V6MEFCPXV577K7JJ
🔍 Order check: { activeOrder: { id, customer, shippingAddress, ... } }
✅ Order validation passed, creating payment intent...
📦 Vendure response: { data: { createStripePaymentIntent: "pi_xxx_secret_yyy" } }
✅ Payment intent created successfully
```

### ❌ Caso con Error - Faltan Datos:
```
📝 Creating payment intent for order: V6MEFCPXV577K7JJ
🔍 Order check: { activeOrder: { id, customer, ... } }
❌ Order incomplete: Missing required fields: shipping method
```

### ❌ Caso con Error - No hay StripePlugin:
```
📝 Creating payment intent for order: V6MEFCPXV577K7JJ
🔍 Order check: { activeOrder: { ... } }
✅ Order validation passed, creating payment intent...
📦 Vendure response: { errors: [{ message: "Cannot query field 'createStripePaymentIntent'" }] }
❌ GraphQL errors: StripePlugin not configured
```

## Pasos para Resolver

### Problema 1: StripePlugin no configurado

**Error:**
```json
{
  "error": "GraphQL error",
  "details": [
    {
      "message": "Cannot query field 'createStripePaymentIntent' on type 'Mutation'"
    }
  ]
}
```

**Solución:**
1. Instala el plugin en Vendure:
   ```bash
   cd vendure-backend
   npm install @vendure/payments-plugin
   ```

2. Configura en `vendure-config.ts`:
   ```typescript
   import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
   
   export const config: VendureConfig = {
     plugins: [
       StripePlugin.init({
         storeCustomersInStripe: true,
       }),
     ],
   };
   ```

3. Reinicia Vendure:
   ```bash
   npm run dev
   ```

4. Crea un Payment Method en Admin:
   - Ve a Settings → Payment Methods
   - Click "Create new payment method"
   - Nombre: "Stripe"
   - Handler: "Stripe payments"
   - Configura con tus claves de Stripe

### Problema 2: Faltan datos en la orden

**Error:**
```json
{
  "error": "Order incomplete",
  "details": "Missing required fields: shipping address, shipping method"
}
```

**Solución:**
Asegúrate de que el flujo de checkout llame los endpoints en orden:

1. ✅ Set Customer:
   ```typescript
   await fetch('/api/checkout/set-customer', {
     method: 'POST',
     body: JSON.stringify({
       firstName: 'John',
       lastName: 'Doe',
       emailAddress: 'john@example.com'
     })
   });
   ```

2. ✅ Set Shipping Address:
   ```typescript
   await fetch('/api/checkout/set-shipping-address', {
     method: 'POST',
     body: JSON.stringify({
       fullName: 'John Doe',
       streetLine1: '123 Main St',
       city: 'Miami',
       province: 'FL',
       postalCode: '33101',
       countryCode: 'US',
       phoneNumber: '+1555123456'
     })
   });
   ```

3. ✅ Set Shipping Method:
   ```typescript
   await fetch('/api/checkout/set-shipping-method', {
     method: 'POST',
     body: JSON.stringify({
       shippingMethodId: '1'
     })
   });
   ```

4. ✅ Crear Payment Intent:
   ```typescript
   await fetch('/api/checkout/payment-intent', {
     method: 'POST',
     body: JSON.stringify({
       orderCode: 'V6MEFCPXV577K7JJ'
     })
   });
   ```

### Problema 3: Claves de Stripe incorrectas

**Error en Vendure logs:**
```
Invalid API Key provided
```

**Solución:**
1. Verifica que las claves sean correctas
2. Verifica que estés usando test keys (`sk_test_` y `pk_test_`)
3. Las claves deben estar en el `.env` de **Vendure**, no de Next.js

### Problema 4: Orden en estado incorrecto

**Error:**
```
Order is not in a valid state for payment
```

**Solución:**
La orden debe estar en `AddingItems` o `ArrangingPayment`. Si está en otro estado:
```typescript
// Transicionar la orden al estado correcto
mutation {
  transitionOrderToState(state: "ArrangingPayment") {
    ... on Order {
      state
    }
  }
}
```

## Testing con GraphQL Playground

Puedes probar directamente en `http://localhost:3000/graphiql/shop`:

```graphql
mutation {
  createStripePaymentIntent(orderCode: "V6MEFCPXV577K7JJ")
}
```

**Respuesta esperada:**
```json
{
  "data": {
    "createStripePaymentIntent": "pi_xxx_secret_yyy"
  }
}
```

**Si hay error:**
```json
{
  "errors": [
    {
      "message": "Detailed error message from Vendure"
    }
  ]
}
```

## Verificación Final

Antes de crear un Payment Intent, verifica que todo esté listo:

### Checklist:
- [ ] StripePlugin instalado en Vendure
- [ ] Claves de Stripe configuradas en Vendure
- [ ] Payment Method "Stripe" creado en Admin
- [ ] Orden tiene customer (email)
- [ ] Orden tiene shipping address
- [ ] Orden tiene shipping method
- [ ] Orden tiene al menos 1 item
- [ ] Cookies se están pasando correctamente

### Script de verificación:

Puedes usar este script en la consola de tu navegador:

```javascript
// 1. Verificar orden activa
const order = await fetch('/api/cart/active').then(r => r.json());
console.log('Order:', order);

// 2. Verificar que tenga todo
console.log('Has customer:', !!order.activeOrder?.customer);
console.log('Has shipping address:', !!order.activeOrder?.shippingAddress);
console.log('Has shipping method:', order.activeOrder?.shippingLines?.length > 0);

// 3. Intentar crear Payment Intent
const paymentIntent = await fetch('/api/checkout/payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderCode: order.activeOrder.code })
}).then(r => r.json());

console.log('Payment Intent:', paymentIntent);
```

## Recursos Adicionales

- [Vendure StripePlugin Documentation](https://docs.vendure.io/reference/core-plugins/payments-plugin/stripe-plugin)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Vendure Checkout Flow](https://docs.vendure.io/guides/storefront/checkout-flow)

## Contacto

Si después de seguir estos pasos el problema persiste:
1. Revisa los logs completos de Vendure
2. Revisa los logs de la consola del navegador
3. Revisa los logs del servidor Next.js
4. Busca en Discord de Vendure o abre un issue

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0

