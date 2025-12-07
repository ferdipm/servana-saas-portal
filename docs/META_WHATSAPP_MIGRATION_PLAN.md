# Plan de Migración: Twilio → Meta WhatsApp Business API

## Resumen

Este documento describe el plan para migrar el sistema de mensajería WhatsApp de Twilio a la API directa de Meta, con el objetivo de reducir costos y tener mayor control sobre la integración.

---

## ✅ ESTADO: IMPLEMENTADO

El código ya está listo para usar Meta WhatsApp API. Solo falta configurar las variables de entorno.

### Archivos creados/modificados:

**Nuevos archivos:**
- `servana-ai/src/services/meta_whatsapp.ts` - Servicio de envío via Meta API
- `servana-ai/src/services/whatsapp.ts` - Wrapper unificado (Meta/Twilio)
- `servana-ai/src/routes/meta.ts` - Webhook para recibir mensajes de Meta

**Modificados:**
- `servana-ai/src/index.ts` - Registra rutas de Meta
- `servana-ai/.env.example` - Variables de Meta
- Todos los archivos que usaban Twilio ahora usan el wrapper

---

## Pasos para Activar Meta WhatsApp

### 1. Configurar variables de entorno

En tu `.env` o en Railway:

```env
# Elegir provider
WHATSAPP_PROVIDER=meta

# Credenciales Meta (obtener de developers.facebook.com)
META_WHATSAPP_ACCESS_TOKEN=tu_access_token
META_WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
META_WHATSAPP_BUSINESS_ACCOUNT_ID=tu_business_account_id
META_WEBHOOK_VERIFY_TOKEN=servana_webhook_token
```

### 2. Configurar Webhook en Meta

1. Ve a https://developers.facebook.com/apps/TU_APP/whatsapp-business/wa-dev-console
2. En "Configuration" > "Webhooks", configura:
   - **Callback URL**: `https://tu-servidor.railway.app/meta/webhook`
   - **Verify Token**: El mismo que pusiste en `META_WEBHOOK_VERIFY_TOKEN`
3. Suscríbete a los campos:
   - `messages` (obligatorio)
   - `message_status` (opcional, para delivery reports)

### 3. Testing

Usa el endpoint de test para verificar:

```bash
curl -X POST https://tu-servidor/meta/test \
  -H "Content-Type: application/json" \
  -d '{"From": "whatsapp:+34612345678", "Body": "Hola quiero reservar"}'
```

---

## Comparativa de Costos

### Twilio (Anterior)
- **Mensaje enviado por negocio**: ~$0.005 - $0.015 USD
- **Mensaje recibido**: ~$0.005 USD
- **Plantillas de marketing**: ~$0.02 - $0.05 USD
- **Fee mensual**: Variable según uso

### Meta API Directa (Actual)
- **Primeras 1,000 conversaciones/mes**: GRATIS
- **Conversaciones de servicio**: ~$0.004 - $0.008 USD
- **Conversaciones de marketing**: ~$0.02 - $0.05 USD
- **Sin fee mensual** de plataforma intermediaria

### Ahorro Potencial
- **50-70%** en costos de mensajería para volúmenes bajos/medios
- Mayor control sobre plantillas y analytics

---

## Endpoints Disponibles

### Meta (nuevo)
- `GET /meta/webhook` - Verificación del webhook (Meta lo llama al configurar)
- `POST /meta/webhook` - Recibir mensajes de WhatsApp
- `POST /meta/test` - Testing síncrono

### Twilio (legacy, sigue funcionando)
- `POST /twilio/webhook` - Recibir mensajes
- `POST /twilio/test` - Testing síncrono

---

## Diferencias Clave en la API

| Aspecto | Twilio | Meta API |
|---------|--------|----------|
| Webhook | POST con form-data | POST con JSON |
| Autenticación | Account SID + Auth Token | Bearer Token |
| Número formato | `whatsapp:+34...` | `34...` (sin prefijo) |
| Plantillas | Aprobadas en Twilio | Aprobadas en Meta |
| Botones interactivos | Content Templates | Mensajes `interactive` nativos |
| Media | URL directa | Media ID o URL |
| Límites | Por plan Twilio | 1000 conv/día iniciales (escalable) |

---

## Estructura de Mensaje Entrante (Meta)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "PHONE_NUMBER",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "contacts": [{
          "profile": { "name": "Juan García" },
          "wa_id": "34612345678"
        }],
        "messages": [{
          "from": "34612345678",
          "id": "wamid.xxx",
          "timestamp": "1234567890",
          "type": "text",
          "text": {
            "body": "Quiero reservar para 4 personas"
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

---

## Funcionalidades del Servicio Meta

### Envío de mensajes de texto
```typescript
import { sendWhatsAppMessage } from './services/whatsapp.js';
await sendWhatsAppMessage('34612345678', 'Hola, tu reserva está confirmada');
```

### Recordatorios con botones interactivos
```typescript
import { sendWhatsAppReminderWithConfirmation } from './services/whatsapp.js';
await sendWhatsAppReminderWithConfirmation(
  '34612345678',
  'Te recordamos tu reserva para mañana a las 20:00',
  'reservation-uuid'
);
// Envía botones ✅ Confirmar / ❌ Cancelar
```

### Envío de imágenes
```typescript
import { sendWhatsAppImage } from './services/whatsapp.js';
await sendWhatsAppImage(
  '34612345678',
  'https://ejemplo.com/menu.jpg',
  'Aquí tienes nuestra carta'
);
```

### Plantillas pre-aprobadas
```typescript
import { sendWhatsAppTemplate } from './services/whatsapp.js';
await sendWhatsAppTemplate(
  '34612345678',
  'reservation_reminder',
  'es',
  [{ type: 'body', parameters: [{ type: 'text', text: 'Juan' }] }]
);
```

---

## Variables de Entorno Completas

```env
# ========================================
# WHATSAPP PROVIDER (elegir uno)
# ========================================
WHATSAPP_PROVIDER=meta  # o "twilio"

# ----------------------------------------
# Meta WhatsApp Cloud API (RECOMENDADO)
# ----------------------------------------
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx
META_WHATSAPP_PHONE_NUMBER_ID=123456789
META_WHATSAPP_BUSINESS_ACCOUNT_ID=987654321
META_WEBHOOK_VERIFY_TOKEN=servana_webhook_token

# ----------------------------------------
# Twilio (LEGACY)
# ----------------------------------------
# TWILIO_ACCOUNT_SID=ACxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxx
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## Recursos Útiles

- [Documentación oficial Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Guía de webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Plantillas de mensajes](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Mensajes interactivos](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages)
- [Pricing oficial](https://developers.facebook.com/docs/whatsapp/pricing)

---

## Checklist de Activación

- [x] Código implementado
- [ ] Access Token permanente generado en Meta
- [ ] Webhook URL configurado en Meta
- [ ] Webhook verificado (Meta hace GET para verificar)
- [ ] Variables de entorno configuradas en Railway
- [ ] Test enviando mensaje desde WhatsApp
- [ ] Test de recordatorios con botones

---

*Documento creado: Diciembre 2024*
*Implementación completada: 6 Diciembre 2025*
