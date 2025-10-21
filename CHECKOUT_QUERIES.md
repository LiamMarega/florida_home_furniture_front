# Queries Copy-Paste para Testing

Usá estas queries en Altair GraphQL Client apuntando a `http://localhost:3000/shop-api`

## 1. Verificar sesión

```graphql
query {
  activeCustomer {
    id
    emailAddress
  }
}
```

## 2. Logout

```graphql
mutation {
  logout {
    success
  }
}
```

## 3. Ver orden activa

```graphql
query {
  activeOrder {
    id
    code
    state
    total
    totalWithTax
    customer {
      emailAddress
    }
    shippingAddress {
      fullName
      city
    }
    shippingLines {
      shippingMethod {
        name
      }
    }
    lines {
      id
      quantity
      productVariant {
        name
      }
    }
  }
}
```

## 4. Agregar item al carrito (si está vacío)

```graphql
mutation {
  addItemToOrder(productVariantId: "1", quantity: 1) {
    __typename
    ... on Order {
      id
      code
      totalWithTax
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

## 5. Setear customer (guest)

```graphql
mutation {
  setCustomerForOrder(
    input: {
      firstName: "Test"
      lastName: "User"
      emailAddress: "test@example.com"
      phoneNumber: "+5491112345678"
    }
  ) {
    __typename
    ... on Order {
      id
      code
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

## 6. Setear dirección de envío

```graphql
mutation {
  setOrderShippingAddress(
    input: {
      fullName: "Test User"
      streetLine1: "Calle Test 123"
      streetLine2: ""
      city: "Buenos Aires"
      province: "CABA"
      postalCode: "C1000"
      countryCode: "AR"
      phoneNumber: "+5491112345678"
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

## 7. Ver métodos de envío

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

## 8. Setear método de envío

```graphql
mutation {
  setOrderShippingMethod(shippingMethodId: ["1"]) {
    __typename
    ... on Order {
      id
      total
      totalWithTax
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

## 9. Crear Payment Intent

```graphql
mutation {
  clientSecret: createStripePaymentIntent
}
```

---

## Testing desde tu API Routes

Si preferís probar desde tus API routes de Next.js:

### POST /api/checkout/set-customer

```bash
curl -X POST http://localhost:3000/api/checkout/set-customer \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "emailAddress": "test@example.com",
    "forceGuest": true
  }'
```

### POST /api/checkout/set-shipping-address

```bash
curl -X POST http://localhost:3000/api/checkout/set-shipping-address \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "streetLine1": "Calle Test 123",
    "city": "Buenos Aires",
    "province": "CABA",
    "postalCode": "C1000",
    "country": "AR",
    "phoneNumber": "+5491112345678"
  }'
```

### GET /api/checkout/shipping-methods

```bash
curl http://localhost:3000/api/checkout/shipping-methods
```

### POST /api/checkout/set-shipping-method

```bash
curl -X POST http://localhost:3000/api/checkout/set-shipping-method \
  -H "Content-Type: application/json" \
  -d '{
    "shippingMethodId": "1"
  }'
```

### POST /api/checkout/payment-intent

```bash
curl -X POST http://localhost:3000/api/checkout/payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "TU_ORDER_CODE",
    "emailAddress": "test@example.com"
  }'
```

