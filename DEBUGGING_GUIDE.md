# 🐛 Debugging Guide - Checkout Flow

## Cómo Usar los Logs Mejorados

Después de las mejoras implementadas, ahora tienes **logs detallados** en:
- 🖥️ **Consola del Servidor** (Next.js terminal)
- 🌐 **Consola del Navegador** (Chrome DevTools)

## 📊 Flujo Normal (Sin Errores)

### Navegador (F12 → Console):
```
🚀 Starting checkout submission...
📝 Customer data: { firstName: "John", lastName: "Doe", email: "john@example.com" }
👤 Customer response: { order: {...} }
✅ Customer set successfully
📍 Setting shipping address...
📍 Shipping address response: { order: {...} }
✅ Shipping address set successfully
🚚 Setting shipping method: 1
🚚 Shipping method response: { order: {...} }
✅ Shipping method set successfully
🔄 Reloading order...
💳 Starting payment flow...
📝 Creating payment intent for order: V6MEFCPXV577K7JJ
✅ Payment intent created successfully
🎉 Checkout submission completed!
```

### Servidor (Terminal Next.js):
```
👤 Setting customer: { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com' }
🍪 Request cookies: vendure-session-token=xxx...
📦 Vendure response: { "data": { "setCustomerForOrder": {...} } }
✅ Customer set successfully

📍 Setting shipping address...
✅ Shipping address set successfully

🚚 Setting shipping method: 1
✅ Shipping method set successfully

📝 Creating payment intent for order: V6MEFCPXV577K7JJ
🔍 Order check: { "activeOrder": { "customer": {...}, "shippingAddress": {...} } }
✅ Order validation passed, creating payment intent...
📦 Vendure response: { "data": { "createStripePaymentIntent": "pi_xxx_secret_yyy" } }
✅ Payment intent created successfully
```

## ❌ Escenarios de Error Comunes

### Error 1: "Missing required fields: customer email"

**Navegador:**
```
🚀 Starting checkout submission...
📝 Customer data: { firstName: "John", lastName: "Doe", email: "john@example.com" }
❌ Failed to set customer: { error: "Failed to set customer" }
💥 Error submitting customer data: Failed to set customer
```

**Servidor:**
```
👤 Setting customer: { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com' }
🍪 Request cookies: undefined
❌ GraphQL errors: [{ message: "..." }]
```

**Problema:** No hay cookies de sesión.

**Solución:**
1. Verifica que tengas items en el carrito
2. Verifica que las cookies estén habilitadas en el navegador
3. Revisa que `middleware.ts` esté configurado correctamente

### Error 2: "Cannot query field 'createStripePaymentIntent'"

**Servidor:**
```
📝 Creating payment intent for order: V6MEFCPXV577K7JJ
✅ Order validation passed, creating payment intent...
❌ GraphQL errors: [{ message: "Cannot query field 'createStripePaymentIntent' on type 'Mutation'" }]
```

**Problema:** StripePlugin no está configurado en Vendure.

**Solución:**
```bash
cd vendure-backend
npm install @vendure/payments-plugin
```

```typescript
// vendure-config.ts
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';

export const config: VendureConfig = {
  plugins: [
    StripePlugin.init({
      storeCustomersInStripe: true,
    }),
  ],
};
```

### Error 3: Customer se establece pero luego desaparece

**Servidor:**
```
👤 Setting customer: { ... }
✅ Customer set successfully

📍 Setting shipping address...
❌ No active order found
```

**Problema:** Las cookies no se están pasando entre peticiones.

**Solución:** Ya implementado - verifica que `fetchGraphQL` esté recibiendo `{ req }`.

### Error 4: Shipping methods vacío

**Servidor:**
```
responseeee { data: { eligibleShippingMethods: [] } }
```

**Problema:** Las cookies no se pasan o no hay métodos configurados.

**Solución:**
1. Verifica en Vendure Admin → Settings → Shipping Methods
2. Asegúrate de que `fetchGraphQL` reciba `{ req }`

## 🔍 Debugging Step-by-Step

### Paso 1: Verificar Cookies

En la consola del navegador:
```javascript
document.cookie
```

Deberías ver algo como:
```
vendure-session-token=xxx; vendure-auth-token=yyy
```

### Paso 2: Verificar Active Order

```javascript
fetch('/api/cart/active')
  .then(r => r.json())
  .then(data => console.log('Active Order:', data));
```

Debería devolver una orden con items.

### Paso 3: Probar Set Customer Manualmente

```javascript
fetch('/api/checkout/set-customer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    emailAddress: 'test@example.com'
  })
})
.then(r => r.json())
.then(data => console.log('Set Customer:', data));
```

### Paso 4: Verificar Estado Completo

```javascript
fetch('/api/cart/active')
  .then(r => r.json())
  .then(data => {
    const order = data.activeOrder;
    console.log({
      hasCustomer: !!order?.customer,
      hasShippingAddress: !!order?.shippingAddress,
      hasShippingMethod: order?.shippingLines?.length > 0,
      hasItems: order?.lines?.length > 0
    });
  });
```

## 📝 Checklist Antes de Crear Payment Intent

Copia este script en la consola del navegador antes de proceder al pago:

```javascript
async function checkCheckoutReady() {
  const order = await fetch('/api/cart/active').then(r => r.json());
  const activeOrder = order.activeOrder;
  
  if (!activeOrder) {
    console.error('❌ No active order');
    return false;
  }
  
  const checks = {
    '✅ Has items': activeOrder.lines?.length > 0,
    '✅ Has customer': !!activeOrder.customer?.emailAddress,
    '✅ Has shipping address': !!activeOrder.shippingAddress?.streetLine1,
    '✅ Has shipping method': activeOrder.shippingLines?.length > 0,
    '✅ Has total': activeOrder.totalWithTax > 0
  };
  
  console.table(checks);
  
  const allGood = Object.values(checks).every(v => v);
  console.log(allGood ? '🎉 Ready for payment!' : '❌ Not ready');
  
  return allGood;
}

checkCheckoutReady();
```

## 🛠️ Herramientas Útiles

### 1. Chrome DevTools Network Tab

1. Abre DevTools (F12)
2. Ve a la pestaña "Network"
3. Filtra por "Fetch/XHR"
4. Haz el checkout
5. Observa todas las llamadas API y sus respuestas

### 2. Vendure GraphQL Playground

URL: `http://localhost:3000/graphiql/shop`

Prueba queries/mutations manualmente:

```graphql
# Verificar orden activa
query {
  activeOrder {
    id
    code
    state
    customer {
      emailAddress
    }
    shippingAddress {
      streetLine1
    }
    shippingLines {
      shippingMethod {
        name
      }
    }
  }
}

# Set customer manualmente
mutation {
  setCustomerForOrder(input: {
    firstName: "Test"
    lastName: "User"
    emailAddress: "test@example.com"
  }) {
    ... on Order {
      id
      customer {
        emailAddress
      }
    }
  }
}
```

### 3. Logs en Tiempo Real

Terminal 1 (Next.js):
```bash
npm run dev
```

Terminal 2 (Watch logs):
```bash
tail -f .next/trace
```

Terminal 3 (Vendure):
```bash
cd vendure-backend
npm run dev
```

## 🎯 Resumen de Archivos con Logs

### Frontend (Navegador)
- ✅ `/app/checkout/page.tsx` - Logs de flujo de checkout

### Backend (Servidor)
- ✅ `/app/api/checkout/set-customer/route.ts` - Logs de set customer
- ✅ `/app/api/checkout/set-shipping-address/route.ts` - Logs de shipping address
- ✅ `/app/api/checkout/set-shipping-method/route.ts` - Logs de shipping method
- ✅ `/app/api/checkout/payment-intent/route.ts` - Logs de payment intent
- ✅ `/app/api/checkout/shipping-methods/route.ts` - Logs de métodos de envío

## 🆘 Si Nada Funciona

1. **Borra cookies y reinicia:**
   ```javascript
   // En la consola del navegador
   document.cookie.split(";").forEach(c => {
     document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
   });
   location.reload();
   ```

2. **Reinicia todos los servicios:**
   ```bash
   # Next.js
   pkill -f next
   npm run dev
   
   # Vendure
   cd vendure-backend
   pkill -f vendure
   npm run dev
   ```

3. **Verifica variables de entorno:**
   ```bash
   # Next.js (.env.local)
   echo $NEXT_PUBLIC_VENDURE_API_URL
   
   # Vendure (.env)
   echo $STRIPE_SECRET_KEY
   ```

4. **Crea una orden nueva desde cero:**
   - Borra cookies
   - Agrega un producto al carrito
   - Procede al checkout
   - Sigue los logs paso a paso

## 📚 Documentación Relacionada

- `COOKIE_SESSION_FIX.md` - Solución de problemas con cookies
- `PAYMENT_INTENT_TROUBLESHOOTING.md` - Problemas con Payment Intents
- `CHECKOUT_FLOW.md` - Documentación técnica completa
- `QUICK_START_CHECKOUT.md` - Guía de inicio rápido

---

**Última actualización:** Octubre 2025  
**Estado:** ✅ Con logs mejorados para debugging

