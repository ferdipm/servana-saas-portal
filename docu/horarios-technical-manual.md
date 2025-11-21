# Manual Técnico - Sistema de Horarios

## Introducción

El sistema de horarios permite a los restaurantes configurar sus horarios de apertura de manera flexible, incluyendo múltiples turnos por día (desayuno, comida, cena) y gestionar excepciones como días festivos o eventos especiales.

---

## Arquitectura General

### Componentes Principales

1. **OpeningHoursEditor** - Componente principal que orquesta toda la funcionalidad
2. **WeekTimeline** - Visualización gráfica de la semana
3. **SpecialDaysManager** - Gestión de días especiales y excepciones
4. **API de Validación** - Endpoint para validar conflictos con reservas existentes

### Base de Datos

#### Tabla: `restaurant_info`

```sql
-- Campo para horarios regulares
opening_hours JSONB

-- Campo para días especiales (festivos, eventos)
special_days JSONB DEFAULT '[]'::jsonb
```

**Formato de `opening_hours`:**
```json
{
  "Lunes": "13:00-16:00,20:00-23:30",
  "Martes": "13:00-16:00,20:00-23:30",
  "Miércoles": "Cerrado",
  ...
}
```

**Formato de `special_days`:**
```json
[
  {
    "id": "special-1234567890",
    "date": "2024-12-25",
    "name": "Navidad",
    "type": "closed"
  },
  {
    "id": "special-9876543210",
    "date": "2024-12-24",
    "name": "Nochebuena",
    "type": "special_hours",
    "hours": "09:00-15:00"
  }
]
```

---

## Funcionalidades Implementadas

### 1. Horarios por Turnos Nombrados

#### Tipos de Turno
- **Desayuno** ☕ - Por defecto: 08:00-12:00
- **Comida** 🍽️ - Por defecto: 13:00-16:00
- **Cena** 🌙 - Por defecto: 20:00-23:30

#### Estructura de Datos

```typescript
type Shift = {
  id: string;              // Identificador único
  name: string;            // "Desayuno" | "Comida" | "Cena"
  emoji: string;           // "☕" | "🍽️" | "🌙"
  startTime: string;       // "HH:MM"
  endTime: string;         // "HH:MM"
};

type DaySchedule = {
  enabled: boolean;        // Día abierto/cerrado
  shifts: Shift[];         // Array de turnos
};

type WeekSchedule = {
  [day: string]: DaySchedule;  // "Lunes", "Martes", etc.
};
```

#### Funcionalidades por Día
- Toggle abierto/cerrado
- Añadir múltiples turnos
- Editar horarios de cada turno
- Eliminar turnos
- Cambiar tipo de turno (Desayuno → Comida → Cena)
- Expandir/colapsar detalles

### 2. Aplicar a Todos los Días

Permite copiar la configuración de un día a toda la semana con un solo clic.

**Implementación:**
```typescript
const applyToAllDays = (sourceDay: string) => {
  const sourceSchedule = schedule[sourceDay];
  const newSchedule: WeekSchedule = {};

  DAYS.forEach((day) => {
    newSchedule[day] = {
      enabled: sourceSchedule.enabled,
      shifts: sourceSchedule.shifts.map((shift, index) => ({
        ...shift,
        id: `${day}-${Date.now()}-${index}`,
      })),
    };
  });

  setSchedule(newSchedule);
};
```

### 3. Preview en Lenguaje Natural

Genera una descripción legible de los horarios configurados.

**Ejemplos:**
- `🟢 Abierto todos los días de 13:00 a 16:00 y 20:00 a 23:30`
- `🟢 Abierto lunes a viernes • 🔴 Cerrado Sábado y Domingo`
- `⚠️ El restaurante está cerrado todos los días`

**Lógica:**
1. Detecta si todos los días tienen los mismos horarios
2. Agrupa días consecutivos con patrones comunes
3. Muestra días cerrados si son ≤ 2

### 4. Timeline Visual

Componente **WeekTimeline** que muestra:
- Vista de 24 horas horizontal
- Marcadores cada 6 horas (00:00, 06:00, 12:00, 18:00, 24:00)
- Barras de color por tipo de turno:
  - 🟨 Amber: Desayuno
  - 🟢 Emerald: Comida
  - 🔵 Indigo: Cena
- Tooltip con detalles al hacer hover

**Cálculo de posición:**
```typescript
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getShiftPosition = (startTime: string, endTime: string) => {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Manejar turnos que cruzan medianoche (ej: 23:00-02:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const left = (startMinutes / (24 * 60)) * 100;
  const width = ((endMinutes - startMinutes) / (24 * 60)) * 100;

  return { left: `${left}%`, width: `${width}%` };
};
```

### 5. Días Especiales y Excepciones

Componente **SpecialDaysManager** para gestionar:

#### Tipos de Excepciones
- **Cerrado** - El restaurante no abre ese día
- **Horario especial** - Horario diferente al habitual

#### Templates Predefinidos
```typescript
const SPECIAL_DAY_TEMPLATES = [
  { name: "Navidad", date: "2024-12-25", type: "closed" },
  { name: "Año Nuevo", date: "2025-01-01", type: "closed" },
  { name: "Día de Reyes", date: "2025-01-06", type: "closed" },
  { name: "Viernes Santo", date: "2025-04-18", type: "closed" },
  { name: "Día del Trabajo", date: "2025-05-01", type: "closed" },
  { name: "Nochebuena", date: "2024-12-24", type: "special_hours", hours: "09:00-15:00" },
  { name: "Nochevieja", date: "2024-12-31", type: "special_hours", hours: "20:00-03:00" },
];
```

#### Características
- Formulario para crear excepciones personalizadas
- Botones rápidos para festivos comunes
- Separación automática entre excepciones futuras y pasadas
- Formato de fecha legible en español
- Badges de color:
  - 🔴 Rojo: Cerrado
  - ⚠️ Ámbar: Horario especial

### 6. Validación con Reservas Existentes

Sistema que detecta conflictos entre cambios de horarios y reservas confirmadas.

#### API Endpoint: `/api/validate-hours`

**Request:**
```typescript
POST /api/validate-hours
Content-Type: multipart/form-data

{
  restaurantId: string;
  openingHours: string;    // JSON stringified WeekSchedule
  specialDays: string;     // JSON stringified SpecialDay[]
}
```

**Response:**
```typescript
{
  hasConflicts: boolean;
  conflicts?: string[];
  message?: string;
}
```

#### Lógica de Validación

1. **Obtener reservas futuras** (desde hoy en adelante)
```typescript
const { data: reservations } = await supabase
  .from("reservations")
  .select("id, datetime_utc, num_guests")
  .eq("restaurant_id", restaurantId)
  .gte("datetime_utc", today.toISOString())
  .order("datetime_utc", { ascending: true });
```

2. **Para cada reserva, verificar:**

   a. **¿Hay un día especial para esa fecha?**
   ```typescript
   const specialDay = specialDays.find((sd) => sd.date === dateStr);

   if (specialDay?.type === "closed") {
     // Conflicto: reserva en día cerrado
   }

   if (specialDay?.type === "special_hours") {
     // Validar contra horario especial
   }
   ```

   b. **¿El día regular está cerrado?**
   ```typescript
   if (!daySchedule.enabled || daySchedule.shifts.length === 0) {
     // Conflicto: día cerrado con reserva
   }
   ```

   c. **¿La hora cae en algún turno?**
   ```typescript
   const isInAnyShift = daySchedule.shifts.some((shift) => {
     return isTimeBetween(reservationTime, shift.startTime, shift.endTime);
   });
   ```

3. **Generar mensaje de conflicto**
```typescript
conflicts.push(
  `${dateStr} (${dayName}): Reserva a las ${reservationTime} fuera de horarios (${shiftsText})`
);
```

#### Helper Functions

**isTimeBetween** - Maneja turnos que cruzan medianoche:
```typescript
function isTimeBetween(time: string, start: string, end: string): boolean {
  const timeMinutes = timeToMinutes(time);
  let startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);

  // Manejar turnos que cruzan medianoche (ej: 23:00-02:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    if (timeMinutes < startMinutes) {
      return timeMinutes + 24 * 60 >= startMinutes &&
             timeMinutes + 24 * 60 <= endMinutes;
    }
  }

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}
```

#### Flujo de Usuario

1. Usuario modifica horarios
2. Usuario hace clic en "Guardar horarios"
3. Se llama a `validateWithReservations()`
4. Si hay conflictos:
   - Se muestra advertencia en pantalla (mensaje amber)
   - Se muestra diálogo de confirmación con lista de conflictos
   - Usuario puede cancelar o continuar
5. Si no hay conflictos o usuario confirma:
   - Se guardan los cambios
   - Se muestra mensaje de éxito

---

## Flujo de Guardado

### Client-Side (OpeningHoursEditor)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Validar con reservas
  const validation = await validateWithReservations();

  if (validation.hasConflicts && validation.message) {
    setWarningMessage(validation.message);

    if (!confirm(`⚠️ ADVERTENCIA: ${validation.message}...`)) {
      return; // Usuario cancela
    }
  }

  // 2. Convertir a formato legacy
  const openingHoursJson: { [key: string]: string } = {};
  DAYS.forEach((day) => {
    if (schedule[day].enabled && schedule[day].shifts.length > 0) {
      const hoursString = schedule[day].shifts
        .map((shift) => `${shift.startTime}-${shift.endTime}`)
        .join(",");
      openingHoursJson[day] = hoursString;
    } else {
      openingHoursJson[day] = "Cerrado";
    }
  });

  // 3. Enviar a server action
  const formData = new FormData();
  formData.set("restaurantId", restaurantId);
  formData.set("openingHours", JSON.stringify(openingHoursJson));
  formData.set("specialDays", JSON.stringify(specialDays));

  await updateOpeningHours(formData);
};
```

### Server-Side (actions.ts)

```typescript
export async function updateOpeningHours(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const openingHours = formData.get("openingHours");
  const specialDays = formData.get("specialDays");

  // 1. Validación
  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  // 2. Parse JSON
  const parsedHours = JSON.parse(openingHours);
  const parsedSpecialDays = JSON.parse(specialDays || "[]");

  // 3. Preparar update
  const updateData: any = {
    opening_hours: parsedHours,
  };

  if (parsedSpecialDays.length > 0) {
    updateData.special_days = parsedSpecialDays;
  }

  // 4. Actualizar en Supabase
  const { error } = await supabase
    .from("restaurant_info")
    .update(updateData)
    .eq("id", restaurantId);

  if (error) {
    throw new Error("No se han podido actualizar los horarios.");
  }

  // 5. Revalidar página
  revalidatePath("/settings");
}
```

---

## Retrocompatibilidad

El sistema mantiene compatibilidad con el formato legacy:

### Formato Legacy
```json
{
  "Lunes": "13:00-16:00,20:00-23:30",
  "Martes": "Cerrado"
}
```

### Parsing al Cargar
```typescript
const parseInitialHours = (): WeekSchedule => {
  const schedule: WeekSchedule = {};

  DAYS.forEach((day) => {
    const hours = initialHours?.[day];

    if (!hours || hours === "Cerrado") {
      schedule[day] = { enabled: false, shifts: [] };
    } else {
      const shifts: Shift[] = [];
      const ranges = hours.split(",");

      ranges.forEach((range: string, index: number) => {
        const [start, end] = range.trim().split("-");

        // Detectar tipo de turno por hora
        let shiftName = "Turno " + (index + 1);
        let shiftEmoji = "⏰";

        const startHour = parseInt(start.split(":")[0]);
        if (startHour >= 7 && startHour < 12) {
          shiftName = "Desayuno";
          shiftEmoji = "☕";
        } else if (startHour >= 12 && startHour < 17) {
          shiftName = "Comida";
          shiftEmoji = "🍽️";
        } else if (startHour >= 19 || startHour < 2) {
          shiftName = "Cena";
          shiftEmoji = "🌙";
        }

        shifts.push({
          id: `${day}-${index}`,
          name: shiftName,
          emoji: shiftEmoji,
          startTime: start,
          endTime: end,
        });
      });

      schedule[day] = { enabled: shifts.length > 0, shifts };
    }
  });

  return schedule;
};
```

---

## Estados y Mensajes

### Estados de Carga
```typescript
const [isPending, startTransition] = useTransition();
```

### Mensajes al Usuario
```typescript
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
const [warningMessage, setWarningMessage] = useState<string | null>(null);
```

### Renderizado de Mensajes
```tsx
{errorMessage && (
  <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
    {errorMessage}
  </div>
)}

{warningMessage && (
  <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-md px-3 py-2">
    ⚠️ {warningMessage}
  </div>
)}

{successMessage && (
  <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-md px-3 py-2">
    {successMessage}
  </div>
)}
```

---

## Migración de Base de Datos

### Archivo: `005_add_special_days.sql`

```sql
BEGIN;

-- Añadir columna special_days
ALTER TABLE restaurant_info
  ADD COLUMN IF NOT EXISTS special_days JSONB DEFAULT '[]'::jsonb;

-- Comentario descriptivo
COMMENT ON COLUMN restaurant_info.special_days IS
  'Array de días especiales con formato: [{ id, date, name, type: "closed"|"special_hours", hours? }]';

-- Índice GIN para búsquedas en el JSONB
CREATE INDEX IF NOT EXISTS idx_restaurant_info_special_days
  ON restaurant_info USING GIN (special_days);

COMMIT;
```

### Pasos para Aplicar
1. Abrir Supabase SQL Editor
2. Copiar contenido de `005_add_special_days.sql`
3. Ejecutar
4. Verificar que el campo `special_days` existe en `restaurant_info`

---

## Permisos y Seguridad

### Row-Level Security (RLS)

Los campos `opening_hours` y `special_days` están protegidos por las políticas RLS existentes de `restaurant_info`.

Solo usuarios con acceso al restaurante pueden:
- Leer los horarios (SELECT)
- Modificar los horarios (UPDATE) si tienen rol apropiado

### Roles Read-Only

Los siguientes roles NO pueden modificar horarios:
- `staff`
- `waiter`
- `viewer`
- `read_only`

**Implementación:**
```typescript
const isReadOnly =
  role === "staff" ||
  role === "waiter" ||
  role === "viewer" ||
  role === "read_only";

// Deshabilitar controles
<button disabled={isReadOnly || isPending}>
  Guardar horarios
</button>
```

---

## Testing

### Casos de Prueba

#### 1. Horarios Básicos
- ✅ Crear turno de comida
- ✅ Crear turno de cena
- ✅ Añadir múltiples turnos al mismo día
- ✅ Eliminar turno
- ✅ Marcar día como cerrado
- ✅ Aplicar horarios a toda la semana

#### 2. Días Especiales
- ✅ Crear día cerrado (festivo)
- ✅ Crear horario especial
- ✅ Usar template rápido
- ✅ Eliminar excepción
- ✅ Verificar ordenamiento por fecha

#### 3. Validación
- ✅ Cambiar horario sin reservas → Sin conflictos
- ✅ Cerrar día con reservas → Mostrar advertencia
- ✅ Reducir horario dejando reservas fuera → Mostrar conflictos específicos
- ✅ Cancelar cambios ante advertencia
- ✅ Confirmar cambios con conflictos

#### 4. Edge Cases
- ✅ Turno que cruza medianoche (23:00-02:00)
- ✅ Sin horarios configurados
- ✅ Todos los días cerrados
- ✅ Todos los días con mismos horarios
- ✅ Excepciones pasadas vs futuras

---

## Performance

### Optimizaciones Implementadas

1. **useState para estado local**
   - No re-renderiza todo el formulario en cada cambio
   - Solo actualiza el día modificado

2. **Índice GIN en special_days**
   - Búsquedas rápidas en el array JSONB
   - Útil cuando el sistema escale a muchos restaurantes

3. **Validación asíncrona**
   - Solo se ejecuta al hacer submit
   - No valida en cada cambio (evita sobrecarga)

4. **Paginación de conflictos**
   - Solo muestra primeros 5 conflictos en mensaje
   - Resto se indica con "... y N más"

### Métricas Estimadas

- **Tiempo de carga inicial**: < 100ms
- **Tiempo de guardado**: 200-500ms (incluye validación)
- **Tiempo de validación**: 100-300ms (depende de número de reservas)

---

## Troubleshooting

### Problema: No se guardan los días especiales

**Causa:** Campo `special_days` no existe en la base de datos

**Solución:** Ejecutar migración `005_add_special_days.sql`

---

### Problema: Error "Cannot read property 'shifts' of undefined"

**Causa:** Horario no parseado correctamente

**Solución:** Verificar formato de `opening_hours` en base de datos

---

### Problema: Validación no detecta conflictos

**Causa:** Zona horaria incorrecta o formato de fecha inválido

**Solución:** Verificar que `datetime_utc` en reservations está en formato ISO 8601

---

### Problema: Timeline muestra barras en posición incorrecta

**Causa:** Turnos que cruzan medianoche no se manejan correctamente

**Solución:** Verificar función `getShiftPosition` y lógica de `endMinutes < startMinutes`

---

## Roadmap Futuro

### Posibles Mejoras

1. **Exportar lista de reservas afectadas**
   - Botón "Exportar CSV" con reservas en conflicto
   - Incluir nombre, teléfono, fecha/hora

2. **Notificación automática a clientes**
   - Enviar SMS/WhatsApp a clientes afectados
   - Template: "Tu reserva del [fecha] puede verse afectada..."

3. **Reprogramación asistida**
   - Sugerir horarios alternativos
   - Botón "Reprogramar automáticamente"

4. **Historial de cambios**
   - Auditoría de modificaciones de horarios
   - ¿Quién cambió qué y cuándo?

5. **Sincronización con Google Calendar**
   - Exportar días especiales a calendario
   - Recordatorios automáticos

6. **Plantillas por temporada**
   - "Horario de verano"
   - "Horario de invierno"
   - Cambio automático en fecha específica

---

## Contacto y Soporte

Para dudas técnicas sobre esta implementación, contactar al equipo de desarrollo.
