# Fix: ALREADY_LOGGED_IN_ERROR con Cookie Jar Pattern

## El Problema

Recibías este error:
```json
{
  "errorCode": "ALREADY_LOGGED_IN_ERROR",
  "message": "Cannot set a Customer for the Order when already logged in"
}
```

### ¿Por qué pasaba?

1. Hacías `logout` y Vendure devolvía `Set-Cookie` borrando la sesión
2. **PERO** las siguientes llamadas GraphQL seguían usando las cookies originales del request
3. Vendure seguía viendo la sesión activa → `ALREADY_LOGGED_IN_ERROR`

### Diagrama del problema:

```
Request original → Cookie: vendure-auth-token=abc123
                    ↓
                 logout()
                    ↓
    Vendure devuelve: Set-Cookie: vendure-auth-token=; Expires=...
                    ↓
                ❌ PERO...
                    ↓
    GET_ACTIVE_CUSTOMER sigue usando: Cookie: vendure-auth-token=abc123
                    ↓
    setCustomerForOrder sigue usando: Cookie: vendure-auth-token=abc123
                    ↓
            🚨 ALREADY_LOGGED_IN_ERROR
```

## La Solución: Cookie Jar Pattern

Implementamos un "cookie jar" local que captura y reutiliza las cookies dentro del mismo request.

### Cambios realizados:

#### 1. `lib/vendure-server.ts`

Agregamos soporte para pasar cookies directamente:

```typescript
export async function fetchGraphQL<T = any>(
  request: GraphQLRequest,
  options?: {
    req?: Request;
    cookie?: string; // 🧁 Nueva opción
    // ...
  }
): Promise<GraphQLResponse<T>> {
  // Priority: direct cookie > req cookies > headers
  const cookieHeader = options?.cookie 
    || options?.req?.headers.get('cookie') 
    || options?.headers?.['Cookie'] 
    || '';
  
  // ...
}
```

#### 2. `app/api/checkout/set-customer/route.ts`

Implementamos el cookie jar:

```typescript
// 🧁 Helpers
function onlyNameValue(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0];
}

function mergeCookieHeaders(...parts: (string | undefined)[]): string {
  const map = new Map<string, string>();
  // Merge y deduplica cookies...
  return Array.from(map.values()).join('; ');
}

export async function POST(req: NextRequest) {
  // 🧁 Cookie jar local
  let cookieJar: string | undefined = req.headers.get('cookie') || undefined;

  // 1) Estado inicial
  const activeCustomerRes = await fetchGraphQL(
    { query: GET_ACTIVE_CUSTOMER }, 
    { req, cookie: cookieJar } // 🧁 Usa el jar
  );

  // 2) Si hay sesión y queremos guest → LOGOUT
  if (forceGuest && activeCustomer?.id) {
    const logoutRes = await fetchGraphQL(
      { query: LOGOUT }, 
      { req, cookie: cookieJar } // 🧁 Usa el jar
    );

    // 🧁 CAPTURAR cookies nuevas del logout
    if (logoutRes.setCookies?.length) {
      const newCookies = logoutRes.setCookies.map(onlyNameValue).join('; ');
      cookieJar = mergeCookieHeaders(cookieJar, newCookies);
      // Ahora cookieJar tiene la cookie que borra la sesión
    }
  }

  // 3) Releer con cookies actualizadas
  const postAuthCustomerRes = await fetchGraphQL(
    { query: GET_ACTIVE_CUSTOMER }, 
    { req, cookie: cookieJar } // 🧁 Ya no ve la sesión anterior
  );

  // 4) setCustomerForOrder con cookie jar actualizado
  const response = await fetchGraphQL({
    query: SET_CUSTOMER_FOR_ORDER,
    variables: { input: { ... } },
  }, { req, cookie: cookieJar }); // 🧁 Sesión guest confirmada

  // ✅ Ya no da ALREADY_LOGGED_IN_ERROR
}
```

### Diagrama de la solución:

```
Request original → Cookie: vendure-auth-token=abc123
                    ↓
                 cookieJar = "vendure-auth-token=abc123"
                    ↓
                 logout()
                    ↓
    Vendure devuelve: Set-Cookie: vendure-auth-token=; Expires=...
                    ↓
                 🧁 CAPTURA
                    ↓
    cookieJar = "vendure-auth-token=" (sesión borrada)
                    ↓
    GET_ACTIVE_CUSTOMER usa: Cookie: vendure-auth-token=
                    ↓
    setCustomerForOrder usa: Cookie: vendure-auth-token=
                    ↓
            ✅ SUCCESS: Sesión guest reconocida
```

#### 3. `app/api/checkout/payment-intent/route.ts`

Aplicamos el mismo pattern para cuando `payment-intent` necesita setear customer internamente.

## Cómo Funciona

### Helper: `onlyNameValue()`
```typescript
"vendure-auth-token=; Expires=Thu, 01 Jan 1970..." 
  → "vendure-auth-token="
```

Extrae solo la parte `name=value` de un `Set-Cookie`, ignorando `Path`, `HttpOnly`, `Expires`, etc.

### Helper: `mergeCookieHeaders()`
```typescript
mergeCookieHeaders(
  "cookie1=value1; cookie2=value2",  // cookies viejas
  "cookie2=newvalue; cookie3=value3" // cookies nuevas
)
→ "cookie1=value1; cookie2=newvalue; cookie3=value3"
```

Merge y deduplica cookies (las nuevas sobrescriben las viejas con el mismo nombre).

### Cookie Jar Pattern
```typescript
let cookieJar = req.headers.get('cookie'); // Estado inicial

// En cada operación que devuelve Set-Cookie:
const res = await fetchGraphQL(..., { cookie: cookieJar });

if (res.setCookies?.length) {
  const newCookies = res.setCookies.map(onlyNameValue).join('; ');
  cookieJar = mergeCookieHeaders(cookieJar, newCookies);
}

// Siguientes operaciones usan el jar actualizado:
await fetchGraphQL(..., { cookie: cookieJar });
```

## Testing

### Antes del fix:
```bash
curl -X POST http://localhost:3000/api/checkout/set-customer \
  -H "Content-Type: application/json" \
  -H "Cookie: vendure-auth-token=abc123" \
  -d '{"emailAddress": "test@example.com", "forceGuest": true}'
```

**Resultado:** `ALREADY_LOGGED_IN_ERROR` ❌

### Después del fix:
```bash
curl -X POST http://localhost:3000/api/checkout/set-customer \
  -H "Content-Type: application/json" \
  -H "Cookie: vendure-auth-token=abc123" \
  -d '{"emailAddress": "test@example.com", "forceGuest": true}'
```

**Resultado:** `✅ Customer set successfully` ✅

## Logs esperados

```
🍪 Initial cookies: vendure-auth-token=abc123...
📊 Initial state: { hasActiveCustomer: true, hasActiveOrder: true }
🔐 Force guest mode - logging out existing customer
🍪 Cookies after logout: vendure-auth-token=...
📊 Post-auth state: { hasActiveCustomer: false, hasActiveOrder: true }
👤 Setting customer for order with cookie jar: ABC123
✅ Customer set successfully for order: ABC123
```

## Ventajas

1. **Sin race conditions:** Todas las operaciones dentro del mismo request usan el estado correcto
2. **Server-side:** El browser no necesita hacer múltiples requests
3. **Cookies sincronizadas:** El cliente recibe las cookies correctas al final vía `Set-Cookie`
4. **Reutilizable:** El pattern se puede aplicar a otros endpoints que necesiten múltiples operaciones

## Archivos Modificados

1. ✅ `lib/vendure-server.ts` - Agregado soporte para `cookie` parameter
2. ✅ `app/api/checkout/set-customer/route.ts` - Cookie jar implementado
3. ✅ `app/api/checkout/payment-intent/route.ts` - Cookie jar implementado

## Troubleshooting

### Si sigue dando ALREADY_LOGGED_IN_ERROR:

1. **Verificá los logs:** ¿Ves `🍪 Cookies after logout`?
2. **Probá en incógnito:** Descartá cookies viejas del browser
3. **Verificá que logout devuelve Set-Cookie:** 
   ```typescript
   console.log('Logout setCookies:', logoutRes.setCookies);
   ```
4. **Verificá el endpoint:** Asegurate de estar usando `/shop-api` (no `/admin-api`)

### Si cookieJar queda undefined:

Verificá que el request original tiene cookies:
```typescript
console.log('Original request cookie:', req.headers.get('cookie'));
```

Si está undefined, el browser no está enviando cookies. Asegurate de:
- Usar `credentials: 'include'` en fetch del frontend
- Same-origin o CORS configurado correctamente

