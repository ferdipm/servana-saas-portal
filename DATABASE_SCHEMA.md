# Esquema de Base de Datos - Supabase

> Documentación generada automáticamente el 15/11/2025, 1:11:27

## Información General

- **Supabase URL**: https://gfltxcyvdmknwklcycyo.supabase.co
- **Project Ref**: gfltxcyvdmknwklcycyo
- **Esquema**: public
- **Generado con**: Conexión directa a PostgreSQL

---

## Resumen de Tablas

Total de tablas: **8**

- [`chat_history`](#tabla-chat_history) (6 columnas)
- [`conversations`](#tabla-conversations) (6 columnas)
- [`reservations`](#tabla-reservations) (15 columnas)
- [`restaurant_info`](#tabla-restaurant_info) (16 columnas)
- [`restaurants`](#tabla-restaurants) (6 columnas)
- [`session_state`](#tabla-session_state) (9 columnas)
- [`tenant_users`](#tabla-tenant_users) (8 columnas)
- [`tenants`](#tabla-tenants) (25 columnas)

---

## Tabla: `chat_history`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `phone` | text | NO | - |  | - |
| `role` | text | NO | - |  | - |
| `message` | text | NO | - |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |
| `tenant_id` | uuid | YES | - |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `chat_history_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION

### Índices

- **idx_chat_history_created_at**
  ```sql
  CREATE INDEX idx_chat_history_created_at ON public.chat_history USING btree (created_at DESC)
  ```
- **idx_chat_history_phone**
  ```sql
  CREATE INDEX idx_chat_history_phone ON public.chat_history USING btree (phone)
  ```
- **idx_chat_history_tenant**
  ```sql
  CREATE INDEX idx_chat_history_tenant ON public.chat_history USING btree (tenant_id)
  ```

### Políticas RLS (Row Level Security)

- **Portal users can see chat history of own tenants** (SELECT) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
- **Tenants can only access their own chat history** (ALL) - PERMISSIVE
  - USING: `(tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)`

---

## Tabla: `conversations`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `phone` | text | NO | - |  | - |
| `role` | text | NO | - |  | - |
| `message` | text | NO | - |  | - |
| `session_id` | text | YES | - |  | - |
| `created_at` | timestamp with time zone | NO | now() |  | - |

### Índices

- **idx_conversations_phone**
  ```sql
  CREATE INDEX idx_conversations_phone ON public.conversations USING btree (phone)
  ```

### Políticas RLS (Row Level Security)

- **server can insert** (INSERT) - PERMISSIVE
  - WITH CHECK: `true`
- **server can read all** (SELECT) - PERMISSIVE
  - USING: `true`

---

## Tabla: `reservations`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `phone` | text | NO | - |  | - |
| `name` | text | NO | - |  | - |
| `source` | text | YES | 'WhatsApp'::text |  | - |
| `created_at` | timestamp with time zone | NO | now() |  | - |
| `status` | text | NO | 'confirmed'::text |  | - |
| `business_id` | uuid | YES | - |  | - |
| `tz` | text | YES | 'Europe/Zurich'::text |  | - |
| `chat_id` | text | YES | - |  | - |
| `locator` | text | YES | - |  | - |
| `party_size` | integer | YES | - |  | - |
| `datetime_utc` | timestamp with time zone | YES | - |  | - |
| `notes` | text | YES | - |  | - |
| `tenant_id` | uuid | YES | - |  | - |
| `reminder_sent` | boolean | YES | false |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `reservations_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION

### Índices

- **idx_reservations_business**
  ```sql
  CREATE INDEX idx_reservations_business ON public.reservations USING btree (business_id)
  ```
- **idx_reservations_business_id**
  ```sql
  CREATE INDEX idx_reservations_business_id ON public.reservations USING btree (business_id)
  ```
- **idx_reservations_datetime**
  ```sql
  CREATE INDEX idx_reservations_datetime ON public.reservations USING btree (datetime_utc)
  ```
- **idx_reservations_phone**
  ```sql
  CREATE INDEX idx_reservations_phone ON public.reservations USING btree (phone)
  ```
- **idx_reservations_reminder_lookup**
  ```sql
  CREATE INDEX idx_reservations_reminder_lookup ON public.reservations USING btree (datetime_utc, reminder_sent, status) WHERE ((status = 'confirmed'::text) AND (reminder_sent = false))
  ```
- **idx_reservations_tenant**
  ```sql
  CREATE INDEX idx_reservations_tenant ON public.reservations USING btree (tenant_id)
  ```
- **reservations_locator_key**
  ```sql
  CREATE UNIQUE INDEX reservations_locator_key ON public.reservations USING btree (locator)
  ```

### Políticas RLS (Row Level Security)

- **Portal users can insert own reservations** (INSERT) - PERMISSIVE
  - WITH CHECK: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
- **Portal users can select own reservations** (SELECT) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
- **Portal users can update own reservations** (UPDATE) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
  - WITH CHECK: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
- **Tenants can only access their own reservations** (ALL) - PERMISSIVE
  - USING: `(tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)`
- **portal_select_reservations_by_tenant** (SELECT) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
- **server can insert** (INSERT) - PERMISSIVE
  - WITH CHECK: `true`
- **server can read all** (SELECT) - PERMISSIVE
  - USING: `true`

### Triggers

- **airtable-reservation-sync**
  - Timing: AFTER
  - Event: INSERT
  - Action: `EXECUTE FUNCTION supabase_functions.http_request('https://servana-ia-production.up.railway.app/webhooks/airtable', 'POST', '{"Content-type":"application/json"}', '{}', '5000')`
- **airtable-reservation-sync**
  - Timing: AFTER
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION supabase_functions.http_request('https://servana-ia-production.up.railway.app/webhooks/airtable', 'POST', '{"Content-type":"application/json"}', '{}', '5000')`

---

## Tabla: `restaurant_info`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `restaurant_id` | uuid | NO | - | 🔑 | - |
| `name` | text | YES | - |  | - |
| `address` | text | YES | - |  | - |
| `phone` | text | YES | - |  | - |
| `website` | text | YES | - |  | - |
| `menu_url` | text | YES | - |  | - |
| `opening_hours` | jsonb | YES | - |  | - |
| `faq` | jsonb | YES | - |  | - |
| `updated_at` | timestamp with time zone | YES | now() |  | - |
| `menu_items` | jsonb | YES | - |  | - |
| `menu_last_updated` | timestamp with time zone | YES | - |  | - |
| `description` | text | YES | - |  | - |
| `settings` | jsonb | YES | '{}'::jsonb |  | - |
| `tenant_id` | uuid | YES | - |  | - |
| `max_party_size` | integer | YES | 8 |  | - |
| `min_hours_advance` | integer | YES | 1 |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `restaurant_info_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION

### Índices

- **idx_restaurant_info_tenant**
  ```sql
  CREATE INDEX idx_restaurant_info_tenant ON public.restaurant_info USING btree (tenant_id)
  ```

### Políticas RLS (Row Level Security)

- **Portal users can manage their restaurant_info** (ALL) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
  - WITH CHECK: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true))))`
- **Tenants can only access their own restaurant info** (ALL) - PERMISSIVE
  - USING: `(tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)`

---

## Tabla: `restaurants`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `name` | text | NO | - |  | - |
| `whatsapp_number` | text | YES | - |  | - |
| `email` | text | YES | - |  | - |
| `supabase_user_id` | uuid | YES | - |  | - |
| `created_at` | timestamp with time zone | NO | now() |  | - |

### Políticas RLS (Row Level Security)

- **server can insert** (INSERT) - PERMISSIVE
  - WITH CHECK: `true`
- **server can read all** (SELECT) - PERMISSIVE
  - USING: `true`

---

## Tabla: `session_state`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `phone` | text | NO | - | 🔑 | - |
| `name` | text | YES | - |  | - |
| `people` | integer | YES | - |  | - |
| `date` | date | YES | - |  | - |
| `time` | time without time zone | YES | - |  | - |
| `updated_at` | timestamp with time zone | NO | now() |  | - |
| `mode` | text | NO | 'idle'::text |  | - |
| `turns` | integer | NO | 0 |  | - |
| `greeted` | boolean | NO | false |  | - |

### Índices

- **idx_session_state_updated_at**
  ```sql
  CREATE INDEX idx_session_state_updated_at ON public.session_state USING btree (updated_at)
  ```

---

## Tabla: `tenant_users`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `tenant_id` | uuid | NO | - |  | - |
| `email` | text | NO | - |  | - |
| `name` | text | YES | - |  | - |
| `role` | text | YES | 'admin'::text |  | - |
| `auth_user_id` | uuid | YES | - |  | - |
| `is_active` | boolean | YES | true |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `tenant_users_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **idx_tenant_users_email**
  ```sql
  CREATE INDEX idx_tenant_users_email ON public.tenant_users USING btree (email)
  ```
- **idx_tenant_users_tenant**
  ```sql
  CREATE INDEX idx_tenant_users_tenant ON public.tenant_users USING btree (tenant_id)
  ```
- **tenant_users_tenant_id_email_key**
  ```sql
  CREATE UNIQUE INDEX tenant_users_tenant_id_email_key ON public.tenant_users USING btree (tenant_id, email)
  ```

### Políticas RLS (Row Level Security)

- **Users can see users in their tenant** (SELECT) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users_1.tenant_id
   FROM tenant_users tenant_users_1
  WHERE (tenant_users_1.auth_user_id = auth.uid())))`

---

## Tabla: `tenants`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `slug` | text | NO | - |  | - |
| `name` | text | NO | - |  | - |
| `plan` | text | YES | 'free'::text |  | - |
| `stripe_customer_id` | text | YES | - |  | - |
| `stripe_subscription_id` | text | YES | - |  | - |
| `monthly_messages_limit` | integer | YES | 1000 |  | - |
| `monthly_messages_used` | integer | YES | 0 |  | - |
| `monthly_reset_at` | timestamp with time zone | YES | (date_trunc('month'::text, now()) + '1 mon'::interval) |  | - |
| `owner_email` | text | NO | - |  | - |
| `owner_name` | text | YES | - |  | - |
| `whatsapp_number` | text | YES | - |  | - |
| `twilio_account_sid` | text | YES | - |  | - |
| `twilio_auth_token_encrypted` | text | YES | - |  | - |
| `is_active` | boolean | YES | true |  | - |
| `onboarding_completed` | boolean | YES | false |  | - |
| `onboarding_step` | text | YES | 'signup'::text |  | - |
| `timezone` | text | YES | 'Europe/Madrid'::text |  | - |
| `language` | text | YES | 'es'::text |  | - |
| `branding` | jsonb | YES | '{}'::jsonb |  | - |
| `settings` | jsonb | YES | '{}'::jsonb |  | - |
| `metadata` | jsonb | YES | '{}'::jsonb |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |
| `updated_at` | timestamp with time zone | YES | now() |  | - |
| `use_manual_confirmation` | boolean | NO | false |  | - |

### Índices

- **idx_tenants_active**
  ```sql
  CREATE INDEX idx_tenants_active ON public.tenants USING btree (is_active) WHERE (is_active = true)
  ```
- **idx_tenants_slug**
  ```sql
  CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug)
  ```
- **idx_tenants_whatsapp**
  ```sql
  CREATE INDEX idx_tenants_whatsapp ON public.tenants USING btree (whatsapp_number) WHERE (whatsapp_number IS NOT NULL)
  ```
- **tenants_slug_key**
  ```sql
  CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug)
  ```
- **tenants_stripe_customer_id_key**
  ```sql
  CREATE UNIQUE INDEX tenants_stripe_customer_id_key ON public.tenants USING btree (stripe_customer_id)
  ```
- **tenants_whatsapp_number_key**
  ```sql
  CREATE UNIQUE INDEX tenants_whatsapp_number_key ON public.tenants USING btree (whatsapp_number)
  ```

### Políticas RLS (Row Level Security)

- **Users can see their own tenant** (SELECT) - PERMISSIVE
  - USING: `(id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE (tenant_users.auth_user_id = auth.uid())))`

### Triggers

- **update_tenants_updated_at**
  - Timing: BEFORE
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION update_updated_at_column()`

---

## Funciones de Base de Datos

Total de funciones: **4**

### `check_message_limit(tenant_uuid uuid)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.check_message_limit(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_usage INT;
  limit_value INT;
  needs_reset BOOLEAN;
BEGIN
  SELECT
    monthly_messages_used,
    monthly_messages_limit,
    (NOW() > monthly_reset_at)
  INTO current_usage, limit_value, needs_reset
  FROM tenants
  WHERE id = tenant_uuid;

  -- Reset counter si es necesario
  IF needs_reset THEN
    UPDATE tenants
    SET
      monthly_messages_used = 0,
      monthly_reset_at = date_trunc('month', NOW()) + interval '1 month'
    WHERE id = tenant_uuid;

    RETURN TRUE;
  END IF;

  -- Verificar límite
  RETURN current_usage < limit_value;
END;
$function$

```

</details>

---

### `get_tenant_id_by_whatsapp(phone text)`

**Returns**: `uuid`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_tenant_id_by_whatsapp(phone text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT id INTO tenant_uuid
  FROM tenants
  WHERE whatsapp_number = phone
    AND is_active = true
  LIMIT 1;

  RETURN tenant_uuid;
END;
$function$

```

</details>

---

### `increment_message_count(tenant_uuid uuid)`

**Returns**: `void`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.increment_message_count(tenant_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE tenants
  SET monthly_messages_used = monthly_messages_used + 1
  WHERE id = tenant_uuid;
END;
$function$

```

</details>

---

### `update_updated_at_column()`

**Returns**: `trigger`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

</details>

---

