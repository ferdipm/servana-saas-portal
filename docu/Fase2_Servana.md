# Fase 2 - Servana IA: Roadmap de Mejoras

## Visión General

La Fase 2 de Servana IA se centra en expandir las capacidades de la plataforma más allá de la gestión básica de reservas, añadiendo funcionalidades que maximicen la ocupación del restaurante, mejoren la experiencia del cliente y proporcionen herramientas avanzadas de gestión.

---

## Prioridad 1: Lista de Espera Inteligente

### Descripción
Sistema automático de gestión de espera cuando el restaurante está lleno, con notificaciones automáticas cuando se libera disponibilidad.

### Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Cola automática** | Cuando no hay disponibilidad, el bot ofrece añadir al cliente a lista de espera |
| **Priorización** | Sistema de prioridad basado en fecha de solicitud y tamaño del grupo |
| **Notificación automática** | WhatsApp automático cuando se libera una mesa adecuada |
| **Tiempo límite** | Configuración de tiempo máximo para confirmar (ej: 30 minutos) |
| **Escalado automático** | Si no confirma, pasa al siguiente en la lista |

### Flujo del Bot

```
Cliente: "Quiero reservar para el sábado a las 21:00 para 4"
Bot: "Lo siento, no tenemos disponibilidad a las 21:00 para 4 personas.
      ¿Te gustaría que te añada a la lista de espera? Si se libera
      una mesa, te avisaré inmediatamente."
Cliente: "Sí, por favor"
Bot: "Perfecto, María. Te he añadido a la lista de espera para el
      sábado a las 21:00 para 4 personas. Tu posición es la #2.
      Te avisaré en cuanto haya disponibilidad."

[Cuando se cancela una reserva]
Bot: "¡Buenas noticias, María! Se ha liberado disponibilidad para
      el sábado a las 21:00 para 4 personas. ¿Confirmas la reserva?
      Tienes 30 minutos para responder."
```

### Implementación Técnica

**Base de datos:**
```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurant_info(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  requested_date DATE NOT NULL,
  requested_shift TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, notified, confirmed, expired, cancelled
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Nuevas herramientas del bot:**
- `add_to_waitlist`: Añadir cliente a lista de espera
- `check_waitlist_position`: Consultar posición en la lista
- `remove_from_waitlist`: Cancelar solicitud de espera

**Cron job:**
- Verificar cancelaciones y notificar a clientes en espera
- Expirar notificaciones sin respuesta
- Escalar al siguiente en la lista

### Portal de Gestión

- Vista de lista de espera por día/turno
- Gestión manual (mover posición, eliminar, notificar)
- Configuración de tiempo de expiración
- Estadísticas de conversión (espera → reserva)

### Complejidad
**Media-Alta** | Estimación: 2-3 semanas de desarrollo

---

## Prioridad 2: Widget de Reservas para Web

### Descripción
Widget embebible que los restaurantes pueden integrar en su página web para recibir reservas directamente.

### Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Widget embebible** | Script JS que se añade con una línea de código |
| **Personalizable** | Colores y estilos adaptables a la web del restaurante |
| **Disponibilidad en tiempo real** | Muestra slots disponibles del backend |
| **Responsive** | Funciona en móvil y escritorio |
| **Sin redirección** | Modal/overlay que no saca al usuario de la web |

### Diseño del Widget

```
┌─────────────────────────────────────┐
│  🍽️ Reservar Mesa                   │
├─────────────────────────────────────┤
│  📅 Fecha: [Calendario desplegable] │
│  👥 Personas: [- 2 +]               │
│  🕐 Turno: [Comida ▼]               │
├─────────────────────────────────────┤
│  Horarios disponibles:              │
│  [14:00] [14:30] [15:00] [15:30]   │
├─────────────────────────────────────┤
│  Nombre: [________________]         │
│  Teléfono: [________________]       │
│  Email: [________________]          │
│  Notas: [________________]          │
├─────────────────────────────────────┤
│  [     Confirmar Reserva     ]      │
└─────────────────────────────────────┘
```

### Implementación Técnica

**Componentes:**
- Widget React compilado a JS standalone
- API pública para consultar disponibilidad
- Endpoint de creación de reservas (con rate limiting)
- Sistema de tokens por restaurante

**Integración:**
```html
<!-- Código que el restaurante añade a su web -->
<div id="servana-widget"></div>
<script src="https://widget.servana.io/v1/widget.js"
        data-restaurant="UUID"
        data-theme="light"
        data-primary-color="#FF6B35">
</script>
```

**API Endpoints:**
- `GET /api/widget/:restaurantId/availability` - Disponibilidad pública
- `POST /api/widget/:restaurantId/reserve` - Crear reserva desde widget
- `GET /api/widget/:restaurantId/config` - Configuración del widget

### Portal de Gestión

- Generador de código de integración
- Personalización visual (colores, logo, textos)
- Estadísticas de reservas por canal (WhatsApp vs Web)
- Previsualización del widget

### Complejidad
**Media** | Estimación: 2 semanas de desarrollo

---

## Prioridad 3: Gestión de Mesas y Plano del Restaurante

### Descripción
Editor visual del plano del restaurante con asignación inteligente de mesas a reservas.

### Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Editor de plano** | Drag & drop para posicionar mesas |
| **Tipos de mesa** | Configurar capacidad y características (terraza, ventana, etc.) |
| **Asignación automática** | IA asigna mesas según preferencias y disponibilidad |
| **Vista de ocupación** | Timeline visual de ocupación por mesa |
| **Combinación de mesas** | Definir qué mesas se pueden unir para grupos grandes |

### Diseño del Editor

```
┌────────────────────────────────────────────────────────┐
│  Plano del Restaurante - Editar                    💾  │
├────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │                    TERRAZA                       │  │
│  │   [M1]  [M2]  [M3]  [M4]                        │  │
│  │    2     2     4     4                          │  │
│  ├─────────────────────────────────────────────────┤  │
│  │                    INTERIOR                      │  │
│  │   [M5]  [M6]      [M7]    [M8]                  │  │
│  │    2     2         6       4                    │  │
│  │                                                  │  │
│  │   [M9]  [M10]     [BARRA ████████]             │  │
│  │    4     4          8 taburetes                 │  │
│  └─────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────┤
│  Mesas: ⬜ Mesa 2p  ⬜ Mesa 4p  ⬜ Mesa 6p  + Añadir   │
└────────────────────────────────────────────────────────┘
```

### Implementación Técnica

**Base de datos:**
```sql
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurant_info(id),
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  min_capacity INTEGER DEFAULT 1,
  zone TEXT, -- terraza, interior, privado
  features TEXT[], -- ventana, esquina, romantica
  position_x INTEGER,
  position_y INTEGER,
  combinable_with UUID[], -- IDs de mesas que se pueden unir
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE reservation_tables (
  reservation_id UUID REFERENCES reservations(id),
  table_id UUID REFERENCES restaurant_tables(id),
  PRIMARY KEY (reservation_id, table_id)
);
```

**Algoritmo de asignación:**
1. Filtrar mesas por capacidad (party_size <= capacity)
2. Priorizar mesas con capacidad justa (evitar mesa de 6 para 2)
3. Considerar preferencias (terraza, ventana)
4. Verificar disponibilidad en el horario
5. Proponer combinaciones si no hay mesa única

### Portal de Gestión

- Editor visual drag & drop (React DnD o similar)
- Timeline de ocupación por mesa
- Asignación manual con sugerencias
- Configuración de zonas y características

### Complejidad
**Alta** | Estimación: 3-4 semanas de desarrollo

---

## Prioridad 4: Integración con Google Reserve / Apple Maps

### Descripción
Sincronización bidireccional con plataformas de reservas de Google y Apple para captar clientes que buscan restaurantes en maps.

### Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Reserve with Google** | Botón de reserva en ficha de Google Maps |
| **Apple Maps** | Integración con reservas de Apple |
| **Sincronización de disponibilidad** | La disponibilidad se actualiza en tiempo real |
| **Reservas unificadas** | Todas las reservas llegan al mismo panel |
| **Gestión centralizada** | Sin duplicados ni overbooking |

### Requisitos Previos

1. **Google Reserve:**
   - Cuenta de Google Business verificada
   - Cumplir requisitos de Google Reserve Partner Program
   - API de Actions Center

2. **Apple Maps:**
   - Registro en Apple Business Connect
   - Implementación de MapKit JS

### Implementación Técnica

**Google Reserve API:**
```typescript
// Endpoints requeridos por Google
POST /api/google-reserve/check-availability
POST /api/google-reserve/create-booking
POST /api/google-reserve/update-booking
POST /api/google-reserve/cancel-booking
GET /api/google-reserve/booking/:id
```

**Webhook de sincronización:**
- Cuando se crea/modifica/cancela reserva en Servana → actualizar disponibilidad en Google
- Cuando llega reserva de Google → crear en Servana con origen "google"

### Portal de Gestión

- Configuración de conexión con Google Business
- Estado de sincronización
- Estadísticas por canal de origen
- Mapeo de turnos Servana ↔ Google

### Complejidad
**Alta** | Estimación: 3-4 semanas de desarrollo (incluye certificación)

---

## Prioridad 5: Historial y Fidelización de Clientes

### Descripción
CRM básico integrado que recuerda a los clientes, sus preferencias y permite programas de fidelización.

### Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Perfil de cliente** | Historial de visitas, preferencias, alergias |
| **Reconocimiento automático** | El bot recuerda al cliente por su teléfono |
| **Notas del staff** | El equipo puede añadir notas sobre clientes |
| **Segmentación** | VIP, frecuente, nuevo, etc. |
| **Comunicaciones** | Mensajes de cumpleaños, ofertas personalizadas |

### Flujo del Bot con Cliente Conocido

```
[Cliente habitual llama]
Bot: "¡Hola María! Qué alegría verte de nuevo. La última vez
      viniste el 15 de octubre con 4 personas. ¿Quieres reservar
      de nuevo?"

[Cliente con preferencias guardadas]
Bot: "He anotado tu preferencia de mesa en terraza y que
      uno del grupo es celíaco. ¿Mantenemos estas notas?"
```

### Implementación Técnica

**Base de datos:**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurant_info(id),
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  preferences JSONB, -- mesa_preferida, alergias, etc.
  tags TEXT[], -- vip, frecuente, grupo_grande
  total_visits INTEGER DEFAULT 0,
  total_guests INTEGER DEFAULT 0,
  last_visit DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, phone)
);

CREATE TABLE customer_visits (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  reservation_id UUID REFERENCES reservations(id),
  visit_date DATE,
  party_size INTEGER,
  feedback TEXT,
  staff_notes TEXT
);
```

**Integración con el bot:**
- Lookup de cliente al recibir mensaje
- Contexto de historial en el prompt
- Auto-relleno de datos conocidos

### Portal de Gestión

- Lista de clientes con búsqueda y filtros
- Ficha de cliente con historial
- Editor de notas y preferencias
- Segmentación y etiquetas
- Exportación de base de datos

### Complejidad
**Media** | Estimación: 2-3 semanas de desarrollo

---

## Resumen de Prioridades

| # | Feature | Impacto | Complejidad | Estimación |
|---|---------|---------|-------------|------------|
| 1 | Lista de Espera Inteligente | 🔥 Alto | Media-Alta | 2-3 semanas |
| 2 | Widget de Reservas Web | 🔥 Alto | Media | 2 semanas |
| 3 | Gestión de Mesas | 📊 Medio | Alta | 3-4 semanas |
| 4 | Google Reserve / Apple Maps | 📊 Medio | Alta | 3-4 semanas |
| 5 | Historial de Clientes | 📊 Medio | Media | 2-3 semanas |

**Tiempo total estimado Fase 2:** 12-17 semanas

---

## Dependencias y Prerequisitos

### Técnicos
- [ ] Infraestructura de cron jobs robusta (para lista de espera)
- [ ] CDN para servir widget (CloudFlare/Vercel Edge)
- [ ] Cuenta de Google Actions Center (para Reserve)
- [ ] Rate limiting y protección DDoS para APIs públicas

### De Negocio
- [ ] Definir pricing para features premium
- [ ] Documentación de usuario para cada feature
- [ ] Proceso de onboarding para nuevas integraciones

---

## Métricas de Éxito

| Feature | KPI Principal | Objetivo |
|---------|---------------|----------|
| Lista de Espera | Conversión espera→reserva | > 40% |
| Widget Web | % reservas desde web | > 20% del total |
| Gestión de Mesas | Reducción de overbooking | 0 incidencias |
| Google Reserve | Nuevos clientes desde Google | +15% reservas |
| Historial Clientes | Tasa de retorno | +10% clientes recurrentes |

---

## Siguiente Paso

Comenzar con **Lista de Espera Inteligente** como primera feature de la Fase 2, ya que:

1. Maximiza ingresos al no perder clientes cuando hay lleno
2. Mejora la experiencia del cliente (no se queda sin opción)
3. Automatiza un proceso que hoy es manual y propenso a errores
4. Es relativamente independiente del resto de features

---

*Documento creado: Diciembre 2024*
*Versión: 1.0*
