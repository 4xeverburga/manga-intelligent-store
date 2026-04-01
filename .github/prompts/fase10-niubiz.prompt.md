---
description: "Fase 10: Integrar Niubiz Sandbox con auth server-side 2 pasos, Lightbox y callback de verificación para checkout de S/1.00"
---
# Fase 10 — Checkout con Niubiz

## Objetivo
Implementar el flujo completo de pago simbólico (S/ 1.00 por manga) usando la API REST de Niubiz en modo sandbox: autenticación server-side en 2 pasos, generación de sesión para el Lightbox, renderizado del formulario de pago y verificación de la transacción via callback.

## Dependencias
- Fase 8 (Cart con items y total calculado).
- Variables: `NIUBIZ_MERCHANT_ID`, `NIUBIZ_API_USERNAME`, `NIUBIZ_API_PASS`, `NIUBIZ_SECURITY_URL`, `NIUBIZ_SESSION_URL`.

## Tareas

### 1. NiubizAdapter — `src/infrastructure/payment/NiubizAdapter.ts`
Implementa `IPaymentProvider`:

#### Paso 1: Security Token
```typescript
async getSecurityToken(): Promise<string> {
  const credentials = Buffer.from(
    `${NIUBIZ_API_USERNAME}:${NIUBIZ_API_PASS}`
  ).toString('base64');

  const response = await fetch(NIUBIZ_SECURITY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
    },
  });
  
  return await response.text(); // Token como string plano
}
```

#### Paso 2: Session Token
```typescript
async getSessionToken(securityToken: string, amount: number, orderId: string): Promise<string> {
  const response = await fetch(
    `${NIUBIZ_SESSION_URL}/${NIUBIZ_MERCHANT_ID}`,
    {
      method: 'POST',
      headers: {
        'Authorization': securityToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'web',
        amount: amount.toFixed(2),
        antifraud: {
          clientIp: '127.0.0.1',
          merchantDefineData: {
            MDD4: 'integraciones@niubiz.com.pe',
            MDD32: '123456789',
            MDD75: 'Invitado',
            MDD77: 0,
          },
        },
      }),
    }
  );

  const data = await response.json();
  return data.sessionKey;
}
```

#### Método `createSession()` (completo)
```typescript
async createSession(amount: number, orderId: string): Promise<PaymentSession> {
  const securityToken = await this.getSecurityToken();
  const sessionToken = await this.getSessionToken(securityToken, amount, orderId);
  return {
    sessionToken,
    merchantId: NIUBIZ_MERCHANT_ID,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
  };
}
```

### 2. API Routes

#### `src/app/api/checkout/session/route.ts`
```typescript
// POST /api/checkout/session { amount: number, orderId: string }
// Retorna: { sessionToken, merchantId }
// Validar que amount = items.length * 1.00
```

#### `src/app/api/checkout/verify/route.ts`
```typescript
// POST /api/checkout/verify { transactionId: string }
// Verifica con Niubiz que la transacción fue exitosa
// Retorna: PaymentResult
```

### 3. Página de Checkout — `src/app/checkout/page.tsx`
**Layout:**
```
┌────────────────────────────────────────────────┐
│               CHECKOUT                         │
├──────────────────────┬─────────────────────────┤
│   ORDER SUMMARY      │   PAYMENT               │
│                      │                         │
│   - Manga 1   S/1.00│   [Niubiz Lightbox]     │
│   - Manga 2   S/1.00│   (se carga aquí)       │
│   - Manga 3   S/1.00│                         │
│   ─────────────────  │                         │
│   Total:      S/3.00 │                         │
│                      │                         │
│   Items: 2 manual    │                         │
│          1 AI sugg.  │                         │
├──────────────────────┴─────────────────────────┤
│              [← Volver al Chat]                │
└────────────────────────────────────────────────┘
```

### 4. Integración Niubiz Lightbox (Client-side)
- Cargar script de Niubiz sandbox: `https://static-content-qas.vnforapps.com/v2/js/checkout.js`.
- Configurar con `sessionToken` y `merchantId` obtenidos del API.
- Callback `onSuccess`: llamar `/api/checkout/verify` con el `transactionId`.
- Callback `onError`: mostrar error amigable y log para debugging.

```typescript
// Configuración del Lightbox
const config = {
  sessiontoken: sessionToken,
  channel: 'web',
  merchantid: merchantId,
  purchasenumber: orderId,
  amount: totalAmount.toFixed(2),
  cardholderemail: 'customer@example.com',
  expirationminutes: 20,
  timeouturl: `${APP_URL}/checkout?status=timeout`,
  merchantlogo: `${APP_URL}/logo.png`,
  formbuttoncolor: '#dc2626', // CTA color
};
```

### 5. Post-pago: Resultado
- **Éxito**: Mostrar confirmación con animación (checkmark + confetti).
  - "¡Compra simbólica realizada!"
  - Número de transacción, monto, fecha.
  - Botón "Volver al Chat".
  - Limpiar carrito.
- **Error/Timeout**: Mostrar mensaje con opción de reintentar.

### 6. Seguridad
- Security token y session token NUNCA se exponen al cliente.
- Todas las llamadas a Niubiz API se hacen desde server-side routes.
- Validar monto server-side (no confiar en lo que envía el cliente).
- Rate limiting en las API routes de checkout.

## Criterios de Aceptación
- [ ] Security token se obtiene correctamente con Basic Auth
- [ ] Session token se genera para el monto correcto
- [ ] Lightbox de Niubiz se renderiza en la página de checkout
- [ ] Callback de éxito verifica la transacción server-side
- [ ] Carrito se limpia tras pago exitoso
- [ ] Error de pago muestra mensaje amigable sin exponer datos
- [ ] Credenciales de Niubiz nunca llegan al cliente
- [ ] Flujo completo funciona en sandbox: cart → checkout → lightbox → confirmación
