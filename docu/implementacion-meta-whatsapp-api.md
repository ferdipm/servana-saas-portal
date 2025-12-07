# Implementación Técnica: Meta WhatsApp Cloud API

## Resumen

Implementación completa de la integración con Meta WhatsApp Cloud API como alternativa a Twilio, con un sistema de abstracción que permite cambiar entre proveedores sin modificar código.

**Fecha de implementación:** 6 Diciembre 2025
**Estado:** ✅ Completado - Pendiente configuración de credenciales

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      SERVANA-AI                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────────────────────────┐  │
│  │ Webhook Meta │────▶│      routes/meta.ts              │  │
│  │ POST /meta/  │     │  - Verifica firma Meta           │  │
│  │   webhook    │     │  - Extrae mensaje                │  │
│  └──────────────┘     │  - Llama agenticHandleMessage    │  │
│                       └──────────────────────────────────┘  │
│                                    │                         │
│                                    ▼                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              services/whatsapp.ts                     │   │
│  │                  (WRAPPER)                            │   │
│  │                                                       │   │
│  │   if (WHATSAPP_PROVIDER === 'meta')                  │   │
│  │       → meta_whatsapp.ts                             │   │
│  │   else                                               │   │
│  │       → twilio_sender.ts                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│            ┌─────────────┴─────────────┐                    │
│            ▼                           ▼                    │
│  ┌──────────────────┐       ┌──────────────────┐           │
│  │ meta_whatsapp.ts │       │ twilio_sender.ts │           │
│  │                  │       │    (LEGACY)      │           │
│  │ - sendMessage    │       │                  │           │
│  │ - sendInteract.  │       │                  │           │
│  │ - sendImage      │       │                  │           │
│  │ - sendTemplate   │       │                  │           │
│  └────────┬─────────┘       └──────────────────┘           │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Meta Graph API v21.0                         │  │
│  │   https://graph.facebook.com/v21.0/{phone_id}/msgs   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Archivos Creados

### 1. `src/services/meta_whatsapp.ts`

Servicio principal para comunicación con Meta WhatsApp Cloud API.

**Funciones exportadas:**

| Función | Descripción |
|---------|-------------|
| `sendWhatsAppMessage(to, message)` | Envía mensaje de texto simple |
| `sendWhatsAppReminderWithConfirmation(to, body, reservationId)` | Envía mensaje con botones interactivos |
| `sendWhatsAppImage(to, imageUrl, caption?)` | Envía imagen con caption opcional |
| `sendWhatsAppTemplate(to, templateName, lang, components?)` | Envía plantilla pre-aprobada |
| `markMessageAsRead(messageId)` | Marca mensaje como leído |
| `toTwilioFormat(phone)` | Convierte número a formato Twilio |
| `normalizePhoneNumber(phone)` | Normaliza número para Meta API |

**Ejemplo de uso:**

```typescript
import { sendWhatsAppMessage } from './services/meta_whatsapp.js';

// Acepta formato Twilio o Meta
await sendWhatsAppMessage('whatsapp:+34612345678', 'Hola!');
await sendWhatsAppMessage('34612345678', 'Hola!');
```

### 2. `src/services/whatsapp.ts`

Wrapper de abstracción que selecciona el provider según `WHATSAPP_PROVIDER`.

```typescript
const PROVIDER = process.env.WHATSAPP_PROVIDER || 'meta';

export async function sendWhatsAppMessage(to: string, message: string) {
  if (PROVIDER === 'meta') {
    return MetaWhatsApp.sendWhatsAppMessage(to, message);
  }
  return TwilioWhatsApp.sendWhatsAppMessage(to, message);
}
```

### 3. `src/routes/meta.ts`

Webhook para recibir mensajes de Meta WhatsApp.

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/meta/webhook` | Verificación del webhook (Meta lo llama al configurar) |
| POST | `/meta/webhook` | Recibir mensajes entrantes |
| POST | `/meta/test` | Testing síncrono (devuelve respuesta directa) |

**Flujo de procesamiento:**

1. Meta envía POST con payload JSON
2. Responde 200 inmediatamente (evitar timeout)
3. Procesa en background con `setImmediate()`
4. Extrae contenido según tipo (text, interactive, button)
5. Verifica si es respuesta a confirmación (SI/NO)
6. Si no, procesa con `agenticHandleMessage()`
7. Envía respuesta via `sendWhatsAppMessage()`

---

## Archivos Modificados

### `src/index.ts`

```typescript
import { registerMetaRoutes } from './routes/meta.js';
// ...
registerMetaRoutes(app);
```

### `src/services/confirmation_handler.ts`

```typescript
// Antes
import { sendWhatsAppMessage } from "./twilio_sender.js";
// Después
import { sendWhatsAppMessage } from "./whatsapp.js";
```

### `src/services/notifications.ts`

```typescript
import { sendWhatsAppMessage } from "./whatsapp.js";
```

### `src/services/reminder.ts`

```typescript
import { sendWhatsAppReminderWithConfirmation } from "./whatsapp.js";
```

### `src/routes/api.ts`

```typescript
import { sendWhatsAppReminderWithConfirmation } from "../services/whatsapp.js";
```

### `src/routes/twilio.ts`

```typescript
import { sendWhatsAppMessage } from "../services/whatsapp.js";
```

---

## Variables de Entorno

```env
# ========================================
# WHATSAPP PROVIDER
# ========================================
WHATSAPP_PROVIDER=meta  # Opciones: "meta" o "twilio"

# ----------------------------------------
# Meta WhatsApp Cloud API
# ----------------------------------------
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_WHATSAPP_PHONE_NUMBER_ID=123456789012345
META_WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
META_WEBHOOK_VERIFY_TOKEN=servana_webhook_token
```

---

## Diferencias Técnicas: Meta vs Twilio

### Formato de Números

| Provider | Formato Entrada | Formato Interno |
|----------|-----------------|-----------------|
| Twilio | `whatsapp:+34612345678` | `whatsapp:+34612345678` |
| Meta | `34612345678` | `34612345678` |

El sistema normaliza automáticamente entre formatos.

### Estructura de Webhook

**Twilio (form-data):**
```
From=whatsapp%3A%2B34612345678
Body=Hola
```

**Meta (JSON):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "34612345678",
          "type": "text",
          "text": { "body": "Hola" }
        }]
      }
    }]
  }]
}
```

### Botones Interactivos

**Twilio:** Requiere Content Templates pre-configurados en consola Twilio.

**Meta:** Botones nativos en el payload:

```typescript
{
  type: 'interactive',
  interactive: {
    type: 'button',
    body: { text: 'Tu mensaje' },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'confirm_xxx', title: '✅ Confirmar' } },
        { type: 'reply', reply: { id: 'cancel_xxx', title: '❌ Cancelar' } }
      ]
    }
  }
}
```

---

## Testing

### Test Local

```bash
# Iniciar servidor
cd servana-ai && npm run dev

# Test endpoint Meta
curl -X POST http://localhost:3000/meta/test \
  -H "Content-Type: application/json" \
  -d '{"From": "whatsapp:+34612345678", "Body": "Quiero reservar para 4"}'
```

### Verificar Webhook en Meta

Meta enviará un GET para verificar:

```
GET /meta/webhook?hub.mode=subscribe&hub.verify_token=servana_webhook_token&hub.challenge=CHALLENGE_STRING
```

El servidor debe responder con `CHALLENGE_STRING` si el token coincide.

---

## Pasos para Activar en Producción

1. **Obtener credenciales de Meta:**
   - Ir a https://developers.facebook.com/apps/
   - Seleccionar la app > WhatsApp > API Setup
   - Copiar: Access Token, Phone Number ID

2. **Configurar en Railway:**
   ```
   WHATSAPP_PROVIDER=meta
   META_WHATSAPP_ACCESS_TOKEN=xxx
   META_WHATSAPP_PHONE_NUMBER_ID=xxx
   META_WEBHOOK_VERIFY_TOKEN=servana_webhook_token
   ```

3. **Configurar Webhook en Meta:**
   - URL: `https://servana-ai.up.railway.app/meta/webhook`
   - Verify Token: `servana_webhook_token`
   - Suscribirse a: `messages`

4. **Hacer deploy y verificar logs**

---

## Rollback a Twilio

Si es necesario volver a Twilio:

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

No se requiere cambiar código, solo variables de entorno.

---

## Costos Comparativos

| Concepto | Twilio | Meta API |
|----------|--------|----------|
| Primeras 1,000 conv/mes | ~$5-15 | **GRATIS** |
| Mensaje de servicio | $0.005-0.015 | $0.004-0.008 |
| Mensaje marketing | $0.02-0.05 | $0.02-0.05 |
| Fee plataforma | Variable | Ninguno |

**Ahorro estimado:** 50-70% para volúmenes bajos/medios.
