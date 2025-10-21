# Flujo de Checkout - Vendure GraphQL

## Paso 1: Verificar si hay sesión activa

```graphql
query {
  activeCustomer {
    id
    emailAddress
  }
}
```

## Paso 2: Si hay sesión y querés guest checkout, cerrar sesión

```graphql
mutation {
  logout {
    success
  }
}
```

## Paso 3: Verificar que tenés una orden activa (carrito con items)

```graphql
query {
  activeOrder {
    id
    code
    state
    lines {
      id
      quantity
    }
  }
}
```

**Si no hay orden activa:** Agregá items al carrito primero con `addItemToOrder`.

## Paso 4: Setear customer para la orden (solo guest checkout)

```graphql
mutation {
  setCustomerForOrder(
    input: {
      firstName: "Juan"
      lastName: "Pérez"
      emailAddress: "juan.perez@example.com"
      phoneNumber: "+5493511111111"
    }
  ) {
    __typename
    ... on Order {
      id
      code
      state
      customer {
        emailAddress
      }
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

**Errores comunes:**
- `ALREADY_LOGGED_IN_ERROR`: Volvé al paso 2
- `NO_ACTIVE_ORDER_ERROR`: Volvé al paso 3

## Paso 5: Setear dirección de envío

```graphql
mutation {
  setOrderShippingAddress(
    input: {
      fullName: "Juan Pérez"
      streetLine1: "Av. Corrientes 1234"
      streetLine2: "Piso 5"
      city: "Buenos Aires"
      province: "CABA"
      postalCode: "C1043"
      countryCode: "AR"
      phoneNumber: "+5493511111111"
    }
  ) {
    __typename
    ... on Order {
      id
      shippingAddress {
        fullName
        city
      }
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

## Paso 6: Obtener métodos de envío disponibles

```graphql
query {
  eligibleShippingMethods {
    id
    code
    name
    description
    priceWithTax
  }
}
```

## Paso 7: Setear método de envío

```graphql
mutation {
  setOrderShippingMethod(shippingMethodId: ["1"]) {
    __typename
    ... on Order {
      id
      shippingLines {
        shippingMethod {
          name
        }
        priceWithTax
      }
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

## Paso 8: Crear Payment Intent

```graphql
mutation {
  clientSecret: createStripePaymentIntent
}
```

**Respuesta esperada:**
```json
{
  "data": {
    "clientSecret": "pi_3abc123..._secret_..."
  }
}
```

**Errores comunes:**
- Error de monto mínimo de Stripe: Asegurate que el total de la orden sea mayor a $0.50 USD (o el mínimo de tu moneda)
- `NO_ACTIVE_ORDER_ERROR`: Verificá que la orden siga activa
- Order incomplete: Falta customer email, shipping address o shipping method

## Paso 9: Confirmar pago con Stripe Elements

Usá el `clientSecret` del paso anterior con Stripe Elements en el frontend:

```typescript
await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://tudominio.com/checkout/confirmation/ORDER_CODE',
  },
});
```

---

## Notas importantes

1. **Cookies:** Todos los requests deben incluir las cookies de sesión. Vendure usa cookies para mantener la sesión del carrito.

2. **ALREADY_LOGGED_IN_ERROR:** ✅ **RESUELTO** - Nuestras API routes (`/api/checkout/set-customer` y `/api/checkout/payment-intent`) ahora manejan automáticamente el logout y la propagación de cookies con el **Cookie Jar Pattern**. Ver `COOKIE_JAR_FIX.md` para detalles técnicos.
   - Si usás `forceGuest: true`, el endpoint hace logout automáticamente
   - Las cookies se propagan correctamente entre operaciones del mismo request

3. **Monto mínimo de Stripe:** La orden debe tener un total mayor al mínimo permitido por Stripe para tu moneda (ej: USD $0.50, ARS $1.00).

4. **Estado de la orden:** La orden debe estar en estado `AddingItems` o `ArrangingPayment` para crear el Payment Intent.

5. **Testing en Altair/GraphQL Playground:** Asegurate de:
   - Incluir credenciales/cookies en los requests
   - Usar la misma sesión para todos los pasos
   - El endpoint correcto: `http://localhost:3000/shop-api`

6. **Guest Checkout desde el Frontend:**
   ```typescript
   // El endpoint maneja logout automáticamente si forceGuest: true
   await fetch('/api/checkout/set-customer', {
     method: 'POST',
     credentials: 'include', // Importante para cookies
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       firstName: 'Test',
       lastName: 'User',
       emailAddress: 'test@example.com',
       forceGuest: true // ✅ Hace logout automático si hay sesión
     })
   });
   ```

