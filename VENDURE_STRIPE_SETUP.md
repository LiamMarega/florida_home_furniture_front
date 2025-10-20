# 🔧 Configuración de Stripe en Vendure - Guía Completa

## Problema Actual

El frontend intenta crear un Payment Intent pero Vendure devuelve:
```
HTTP error! status: 400
Failed to fetch data
```

Esto significa que **Stripe NO está configurado en Vendure**.

## ✅ Checklist de Configuración

### 1. Verificar que Vendure esté corriendo

```bash
# En el terminal, deberías ver Vendure corriendo en:
http://localhost:3000/admin
http://localhost:3000/shop-api
```

### 2. Instalar el StripePlugin en Vendure

**En el directorio de tu backend de Vendure:**

```bash
cd ../vendure-backend  # o el nombre de tu directorio de Vendure
npm install @vendure/payments-plugin stripe
```

### 3. Configurar el Plugin en vendure-config.ts

Abre `vendure-config.ts` y agrega:

```typescript
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';

export const config: VendureConfig = {
  // ... otras configuraciones
  plugins: [
    // ... otros plugins
    StripePlugin.init({
      // Esto previene que diferentes clientes usen el mismo PaymentIntent
      storeCustomersInStripe: true,
    }),
  ],
};
```

### 4. Configurar Variables de Entorno en Vendure

Crea o edita el archivo `.env` en tu backend de Vendure:

```env
# Stripe Configuration (en el BACKEND, no en el frontend)
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
```

**⚠️ IMPORTANTE:** Estas claves van en el **backend de Vendure**, NO en el frontend de Next.js.

### 5. Reiniciar Vendure

```bash
# En el directorio de Vendure
npm run dev
```

Deberías ver en los logs algo como:
```
[Nest] INFO [StripePlugin] Stripe plugin initialized
```

### 6. Crear Payment Method en Vendure Admin

1. **Accede al Admin Panel:**
   ```
   http://localhost:3000/admin
   ```

2. **Login con tus credenciales de admin**

3. **Ve a Settings (⚙️) → Payment Methods**

4. **Click en "Create new Payment Method"**

5. **Configura el método de pago:**
   - **Name:** `Stripe`
   - **Code:** `stripe-payment-method`
   - **Handler:** Selecciona `Stripe payments` del dropdown
   - **API Key:** Tu `STRIPE_SECRET_KEY` (sk_test_...)
   - **Webhook Secret:** Lo obtendrás del Stripe CLI (ver siguiente paso)

6. **Guarda el Payment Method**

### 7. Configurar Stripe Webhook (Desarrollo Local)

**Instala Stripe CLI** (si no lo tienes):
```bash
# macOS
brew install stripe/stripe-cli/stripe

# O descarga desde: https://stripe.com/docs/stripe-cli
```

**Inicia sesión en Stripe CLI:**
```bash
stripe login
```

**Inicia el webhook forwarder:**
```bash
stripe listen --forward-to http://localhost:3000/payments/stripe
```

**Copia el Webhook Signing Secret** que aparece en el terminal:
```
> Ready! Your webhook signing secret is whsec_xxx...
```

**Actualiza el Payment Method en Vendure Admin:**
1. Ve de nuevo a Settings → Payment Methods
2. Edita el método "Stripe"
3. Agrega el Webhook Secret que copiaste
4. Guarda

## 🧪 Verificar que Funcione

### Prueba 1: Verificar que la mutación existe

Abre el GraphQL Playground de Vendure:
```
http://localhost:3000/shop-graphql
```

Ejecuta esta query para ver si la mutación existe:
```graphql
mutation {
  __type(name: "Mutation") {
    fields {
      name
    }
  }
}
```

Busca `createStripePaymentIntent` en la lista. Si NO aparece, el plugin no está instalado.

### Prueba 2: Crear un Payment Intent manualmente

En el GraphQL Playground, ejecuta:

```graphql
mutation {
  createStripePaymentIntent(orderCode: "TU_ORDER_CODE_AQUI")
}
```

**Respuesta esperada (éxito):**
```json
{
  "data": {
    "createStripePaymentIntent": "pi_3xxxxx_secret_yyyy"
  }
}
```

**Respuesta de error común:**
```json
{
  "errors": [
    {
      "message": "No eligible PaymentMethod handler found for the payment method..."
    }
  ]
}
```
↑ Esto significa que el Payment Method no está creado en el Admin.

## 🐛 Problemas Comunes

### Error: "Cannot query field 'createStripePaymentIntent'"

**Causa:** El StripePlugin no está instalado o no está en la configuración.

**Solución:**
1. Verifica que instalaste `@vendure/payments-plugin`
2. Verifica que agregaste `StripePlugin.init()` en `vendure-config.ts`
3. Reinicia Vendure

### Error: "No eligible PaymentMethod handler found"

**Causa:** No creaste el Payment Method en Vendure Admin.

**Solución:**
1. Ve a `http://localhost:3000/admin`
2. Settings → Payment Methods → Create new
3. Selecciona "Stripe payments" como handler
4. Configura las claves

### Error: "Invalid API Key provided"

**Causa:** La clave de Stripe es incorrecta o no está configurada.

**Solución:**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copia la "Secret key" (sk_test_...)
3. Actualiza el Payment Method en Vendure Admin
4. Reinicia Vendure

### Webhook no funciona

**Causa:** Stripe CLI no está corriendo o el webhook secret es incorrecto.

**Solución:**
1. Verifica que `stripe listen` esté corriendo
2. Copia el nuevo webhook secret del terminal
3. Actualiza el Payment Method en Vendure Admin

## 📋 Checklist Final

Antes de intentar crear un payment intent, verifica:

- [ ] Vendure está corriendo en `localhost:3000`
- [ ] `@vendure/payments-plugin` está instalado
- [ ] `StripePlugin` está en `vendure-config.ts`
- [ ] Variables de entorno configuradas en Vendure
- [ ] Vendure reiniciado después de los cambios
- [ ] Payment Method "Stripe" creado en Admin
- [ ] API Key de Stripe configurada
- [ ] Stripe CLI corriendo: `stripe listen --forward-to localhost:3000/payments/stripe`
- [ ] Webhook Secret configurado en Payment Method
- [ ] La mutación `createStripePaymentIntent` existe en GraphQL

## 🔍 Verificación Rápida

Ejecuta este comando en GraphQL Playground:

```graphql
query {
  paymentMethods {
    id
    code
    name
    handler {
      code
      args {
        name
      }
    }
  }
}
```

Deberías ver algo como:
```json
{
  "data": {
    "paymentMethods": [
      {
        "id": "1",
        "code": "stripe-payment-method",
        "name": "Stripe",
        "handler": {
          "code": "stripe",
          "args": [...]
        }
      }
    ]
  }
}
```

## 🆘 Si Nada Funciona

1. **Revisa los logs de Vendure** para ver errores específicos
2. **Verifica la versión de Vendure** (debe ser compatible con el plugin)
3. **Consulta la documentación oficial:**
   - [Vendure Stripe Plugin](https://docs.vendure.io/reference/core-plugins/payments-plugin/stripe-plugin/)
   - [Stripe API Docs](https://stripe.com/docs/api)

## 📞 Obtén Ayuda

Si sigues teniendo problemas, comparte:
- Los logs completos de Vendure
- La configuración de `vendure-config.ts`
- El resultado de la query `paymentMethods`
- Los mensajes de error específicos

---

Una vez que hayas completado TODOS estos pasos, intenta el checkout nuevamente en:
```
http://localhost:3001/checkout
```

