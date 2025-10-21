# Resumen de Cambios - Fix ALREADY_LOGGED_IN_ERROR

## ✅ Problema Resuelto

El error `ALREADY_LOGGED_IN_ERROR` al intentar hacer checkout guest cuando ya hay una sesión activa.

## 🔧 Cambios Realizados

### 1. `lib/vendure-server.ts`
- ✅ Agregado parámetro `cookie` opcional en `fetchGraphQL()`
- Permite pasar cookies directamente, sobrescribiendo las del request

### 2. `app/api/checkout/set-customer/route.ts`  
- ✅ Implementado **Cookie Jar Pattern**
- Captura cookies de `logout` y las reutiliza en operaciones subsiguientes
- Maneja automáticamente el logout cuando `forceGuest: true`

### 3. `app/api/checkout/payment-intent/route.ts`
- ✅ Implementado **Cookie Jar Pattern**  
- Captura cookies de `setCustomerForOrder` internamente
- Propagación correcta de cookies en todo el flujo

### 4. `lib/graphql/mutations.ts`
- ✅ Corregida mutación `LOGOUT` para incluir subcampos `{ success }`
- ✅ Removido email hardcodeado en `payment-intent`

### 5. Documentación
- ✅ `CHECKOUT_FLOW.md` - Flujo completo paso a paso
- ✅ `CHECKOUT_QUERIES.md` - Queries listas para copy-paste
- ✅ `COOKIE_JAR_FIX.md` - Explicación técnica del fix

---

## 🧪 Cómo Testear

### Opción 1: Desde el Frontend (Recomendado)

1. Asegurate de tener items en el carrito
2. Ejecutá el checkout normalmente con `forceGuest: true`
3. Deberías ver estos logs en la consola del servidor:

```
🍪 Initial cookies: vendure-auth-token=abc...
📊 Initial state: { hasActiveCustomer: true, hasActiveOrder: true }
🔐 Force guest mode - logging out existing customer
🍪 Cookies after logout: vendure-auth-token=...
📊 Post-auth state: { hasActiveCustomer: false, hasActiveOrder: true }
👤 Setting customer for order with cookie jar: ABC123
✅ Customer set successfully for order: ABC123
```

### Opción 2: Con curl

```bash
# 1. Primero agregá algo al carrito (necesitás una orden activa)
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productVariantId": "1", "quantity": 1}'

# 2. Set customer con forceGuest
curl -X POST http://localhost:3000/api/checkout/set-customer \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "emailAddress": "test@example.com",
    "forceGuest": true
  }'
```

**Resultado esperado:** ✅ `"message": "Customer set successfully"`

### Opción 3: Altair GraphQL

Ver `CHECKOUT_QUERIES.md` para queries listas para copy-paste.

---

## 📊 Logs de Debugging

Si necesitás debuggear, buscá estos logs:

```typescript
// Cookie jar inicial
🍪 Initial cookies: vendure-auth-token=...

// Estado antes del logout
📊 Initial state: { hasActiveCustomer: true }

// Cookies después del logout
🍪 Cookies after logout: vendure-auth-token=

// Estado después del logout (debería ser false)
📊 Post-auth state: { hasActiveCustomer: false }

// Set customer con cookies correctas
👤 Setting customer for order with cookie jar: ABC123

// Success
✅ Customer set successfully for order: ABC123
```

---

## 🚨 Troubleshooting

### Sigue dando ALREADY_LOGGED_IN_ERROR

1. Verificá que el log `🍪 Cookies after logout` aparece
2. Verificá que `hasActiveCustomer: false` después del logout
3. Probá en modo incógnito para descartar cookies viejas
4. Asegurate de usar `credentials: 'include'` en el frontend

### cookieJar queda undefined

```typescript
// Agregá este log al inicio del handler:
console.log('Request cookie header:', req.headers.get('cookie'));
```

Si es `null`, el browser no está enviando cookies. Verificá:
- `credentials: 'include'` en fetch
- CORS configurado correctamente
- Same-origin o dominio permitido

### Logout no devuelve Set-Cookie

```typescript
// Verificá la respuesta del logout:
console.log('Logout setCookies:', logoutRes.setCookies);
```

Si es `[]` o `undefined`, Vendure no está devolviendo cookies. Verificá:
- Endpoint correcto: `/shop-api` (no `/admin-api`)
- Vendure configurado para devolver cookies
- Headers `getSetCookie()` disponibles

---

## 📚 Documentación

- **`CHECKOUT_FLOW.md`** → Flujo completo del checkout con todos los pasos
- **`CHECKOUT_QUERIES.md`** → Queries GraphQL listas para testing
- **`COOKIE_JAR_FIX.md`** → Explicación técnica detallada del fix

---

## ✨ Mejoras Implementadas

1. ✅ Cookie jar pattern para propagación de cookies server-side
2. ✅ Logout automático en guest checkout
3. ✅ Logs detallados para debugging
4. ✅ Mutación LOGOUT correcta con subcampos
5. ✅ Email dinámico (no hardcodeado)
6. ✅ Documentación completa del flujo

---

## 🎯 Próximos Pasos

1. Testeá el flujo completo de checkout guest
2. Verificá los logs en la consola del servidor
3. Si todo funciona, commiteá los cambios
4. Considerá agregar tests automatizados para este flujo

---

**¿Dudas?** Revisá `COOKIE_JAR_FIX.md` para entender cómo funciona el fix técnicamente.

