# Testing Checklist - Stripe Integration

## Pre-requisitos

- [ ] Backend de Vendure corriendo en `localhost:3000`
- [ ] Frontend de Next.js corriendo en `localhost:3001`
- [ ] Stripe CLI corriendo: `stripe listen --forward-to localhost:3000/payments/stripe`
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Payment method configurado en Vendure Admin con el webhook secret

## Test 1: Flujo Básico - Usuario Nuevo

### Pasos

1. [ ] Abrir `http://localhost:3001`
2. [ ] Agregar 1-2 productos al carrito
3. [ ] Ir a checkout
4. [ ] Completar formulario:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Dirección completa
   - Seleccionar método de envío
5. [ ] Click "Continue to Payment"
6. [ ] Usar tarjeta de prueba: `4242 4242 4242 4242`
7. [ ] Expiración: cualquier fecha futura (ej: `12/34`)
8. [ ] CVC: `123`
9. [ ] Click "Complete Payment"

### Verificaciones

- [ ] Stripe muestra el formulario de pago correctamente
- [ ] El botón "Complete Payment" está habilitado
- [ ] Después de enviar, redirige a la página de confirmación
- [ ] La página de confirmación muestra estado de éxito
- [ ] El order code es visible
- [ ] Los detalles de la orden se muestran correctamente
- [ ] En Stripe CLI, se ve el evento `payment_intent.succeeded`
- [ ] En los logs de Vendure, se ve el procesamiento del webhook

### Logs Esperados

**Consola del navegador:**
```
🚀 Starting checkout submission...
📍 Setting shipping address...
✅ Shipping address set successfully
👤 Setting customer...
✅ Customer set successfully
🚚 Setting shipping method...
✅ Shipping method set successfully
💳 Starting payment flow...
✅ Client secret received, navigating to payment step
💳 Confirming payment...
```

**Terminal de Stripe CLI:**
```
[200] POST /payments/stripe [evt_xxx]
payment_intent.succeeded
```

## Test 2: Usuario Ya Autenticado

### Pasos

1. [ ] Mantener la sesión del test anterior (no cerrar el navegador)
2. [ ] Agregar más productos al carrito
3. [ ] Ir a checkout
4. [ ] Completar formulario nuevamente
5. [ ] Procesar pago

### Verificaciones

- [ ] Los logs muestran: `✅ User already logged in, skipping customer setup`
- [ ] No se crea un nuevo customer en Vendure
- [ ] El checkout se completa exitosamente
- [ ] Se usa el mismo customer del test anterior

## Test 3: Pago Declinado

### Pasos

1. [ ] Ir a checkout con productos en el carrito
2. [ ] Completar información del cliente
3. [ ] Usar tarjeta de prueba que falla: `4000 0000 0000 9995`
4. [ ] Intentar completar el pago

### Verificaciones

- [ ] Stripe muestra un error en el formulario
- [ ] No redirige a la página de confirmación
- [ ] El usuario puede corregir y reintentar
- [ ] Se muestra un mensaje de error claro

## Test 4: Validación de Campos Requeridos

### Pasos

1. [ ] Ir a checkout
2. [ ] Intentar enviar el formulario sin completar campos
3. [ ] Intentar continuar sin seleccionar método de envío

### Verificaciones

- [ ] Muestra errores de validación en los campos vacíos
- [ ] No permite continuar sin completar todos los campos requeridos
- [ ] El botón de envío está deshabilitado hasta que se carguen los métodos de envío

## Test 5: Payment Intent - Orden Incompleta

### Pasos

1. [ ] Abrir DevTools del navegador
2. [ ] Intentar crear un payment intent sin completar todos los pasos
3. [ ] Observar la respuesta del API

### Verificaciones

- [ ] El API devuelve error 400
- [ ] El mensaje indica qué campos faltan
- [ ] No se crea payment intent en Stripe

## Test 6: Webhook Processing

### Pasos

1. [ ] Completar un checkout exitoso
2. [ ] Observar los logs de Stripe CLI
3. [ ] Observar los logs de Vendure
4. [ ] Verificar el estado de la orden en Vendure Admin

### Verificaciones

- [ ] Stripe CLI muestra: `[200] POST /payments/stripe`
- [ ] Vendure procesa el webhook correctamente
- [ ] La orden transiciona al estado correcto (ej: `PaymentSettled`)
- [ ] El payment se registra en la orden
- [ ] En Vendure Admin, la orden muestra el pago completado

## Test 7: Página de Confirmación - Estados

### Test 7a: Éxito

1. [ ] Completar checkout normalmente
2. [ ] Verificar que la página muestra:
   - [ ] ✅ Ícono de éxito verde
   - [ ] "Order Confirmed!"
   - [ ] Order code
   - [ ] Detalles de la orden
   - [ ] Información de envío
   - [ ] Total pagado

### Test 7b: Pendiente (Async Payment)

1. [ ] Usar un método de pago que requiere más tiempo
2. [ ] Verificar que la página muestra:
   - [ ] ⏳ Ícono de reloj amarillo
   - [ ] "Payment Pending"
   - [ ] Mensaje de que se está procesando
   - [ ] Botón "Refresh Status"

### Test 7c: Fallido

1. [ ] Simular un pago fallido (si es posible con webhooks de prueba)
2. [ ] Verificar que la página muestra:
   - [ ] ❌ Ícono de error rojo
   - [ ] "Payment Failed"
   - [ ] Mensaje de error
   - [ ] Botón "Try Again"

## Test 8: Carrito Persistente

### Pasos

1. [ ] Agregar productos al carrito
2. [ ] Cerrar el navegador
3. [ ] Abrir el navegador nuevamente
4. [ ] Volver a `http://localhost:3001`

### Verificaciones

- [ ] El carrito todavía tiene los productos
- [ ] La cantidad es correcta
- [ ] Puede continuar al checkout

## Test 9: Métodos de Envío

### Pasos

1. [ ] Ir a checkout
2. [ ] Completar dirección de envío
3. [ ] Click "Load Shipping Methods"

### Verificaciones

- [ ] Se cargan los métodos de envío disponibles
- [ ] Se muestran nombres y precios
- [ ] Se puede seleccionar uno
- [ ] El botón "Continue to Payment" se habilita después de seleccionar

## Test 10: Navegación Múltiple

### Pasos

1. [ ] Ir a checkout
2. [ ] Completar información del cliente
3. [ ] Hacer clic en "Back" en el paso de pago
4. [ ] Verificar que los datos se mantienen
5. [ ] Volver a "Continue to Payment"
6. [ ] Completar el pago

### Verificaciones

- [ ] Los datos del formulario se mantienen al volver atrás
- [ ] El payment intent se reutiliza o crea uno nuevo correctamente
- [ ] No hay errores de duplicación

## Comandos Útiles para Testing

### Ver Logs en Tiempo Real

```bash
# Frontend (Next.js)
npm run dev

# Stripe CLI
stripe listen --forward-to localhost:3000/payments/stripe --log-level debug

# Vendure (en el directorio del backend)
npm run dev
```

### Limpiar y Empezar de Nuevo

```bash
# Limpiar cookies del navegador (DevTools > Application > Cookies)
# O usar modo incógnito

# Limpiar órdenes de prueba en Vendure Admin si es necesario
```

## Checklist Final

- [ ] Todos los tests pasaron
- [ ] Los logs no muestran errores
- [ ] Los webhooks se procesan correctamente
- [ ] La UX es fluida sin interrupciones
- [ ] Los mensajes de error son claros
- [ ] Las redirecciones funcionan correctamente
- [ ] No hay duplicación de usuarios/customers
- [ ] Las sesiones se mantienen correctamente

## Problemas Comunes y Soluciones

### "No client secret returned"
- Verificar que Stripe CLI está corriendo
- Verificar webhook secret en Vendure Admin
- Verificar que StripePlugin está configurado

### "Order incomplete"
- Asegurar que se completaron todos los pasos
- Verificar que el shipping method fue seleccionado
- Revisar los logs para ver qué campo falta

### Redirect no funciona
- Verificar `NEXT_PUBLIC_SITE_URL` en `.env.local`
- Reiniciar el servidor de desarrollo
- Verificar que el orderCode es correcto

### Webhook no se procesa
- Verificar que Stripe CLI está corriendo
- Verificar que el webhook secret es correcto
- Revisar logs de Stripe CLI para errores

