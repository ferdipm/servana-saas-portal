# Esquema de Base de Datos - Supabase

> Documentación generada automáticamente el 18/11/2025, 19:10:18

## Información General

- **Supabase URL**: https://gfltxcyvdmknwklcycyo.supabase.co
- **Project Ref**: gfltxcyvdmknwklcycyo
- **Esquema**: public
- **Generado con**: Conexión directa a PostgreSQL

---

## Resumen de Tablas

Total de tablas: **8**

- [`chat_history`](#tabla-chat_history) (7 columnas)
- [`conversations`](#tabla-conversations) (8 columnas)
- [`reservations`](#tabla-reservations) (16 columnas)
- [`restaurant_info`](#tabla-restaurant_info) (17 columnas)
- [`session_state`](#tabla-session_state) (10 columnas)
- [`tenant_users`](#tabla-tenant_users) (8 columnas)
- [`tenants`](#tabla-tenants) (27 columnas)
- [`user_restaurants`](#tabla-user_restaurants) (8 columnas)

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
| `restaurant_id` | uuid | NO | - |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `chat_history_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION
- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `fk_chat_history_restaurant`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **idx_chat_history_created_at**
  ```sql
  CREATE INDEX idx_chat_history_created_at ON public.chat_history USING btree (created_at DESC)
  ```
- **idx_chat_history_phone**
  ```sql
  CREATE INDEX idx_chat_history_phone ON public.chat_history USING btree (phone)
  ```
- **idx_chat_history_restaurant_id**
  ```sql
  CREATE INDEX idx_chat_history_restaurant_id ON public.chat_history USING btree (restaurant_id)
  ```
- **idx_chat_history_restaurant_phone**
  ```sql
  CREATE INDEX idx_chat_history_restaurant_phone ON public.chat_history USING btree (restaurant_id, phone)
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
| `restaurant_id` | uuid | YES | - |  | - |
| `tenant_id` | uuid | YES | - |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `fk_conversations_restaurant`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `fk_conversations_tenant`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **idx_conversations_phone**
  ```sql
  CREATE INDEX idx_conversations_phone ON public.conversations USING btree (phone)
  ```
- **idx_conversations_restaurant_id**
  ```sql
  CREATE INDEX idx_conversations_restaurant_id ON public.conversations USING btree (restaurant_id)
  ```
- **idx_conversations_tenant_id**
  ```sql
  CREATE INDEX idx_conversations_tenant_id ON public.conversations USING btree (tenant_id)
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
| `phone` | text | YES | - |  | - |
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
| `restaurant_id` | uuid | NO | - |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `fk_reservations_restaurant`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
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
- **idx_reservations_restaurant_datetime**
  ```sql
  CREATE INDEX idx_reservations_restaurant_datetime ON public.reservations USING btree (restaurant_id, datetime_utc DESC)
  ```
- **idx_reservations_restaurant_id**
  ```sql
  CREATE INDEX idx_reservations_restaurant_id ON public.reservations USING btree (restaurant_id)
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
  - USING: `((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.is_active = true)))) AND ((EXISTS ( SELECT 1
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.tenant_id = reservations.tenant_id) AND (tenant_users.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM user_restaurants
  WHERE ((user_restaurants.auth_user_id = auth.uid()) AND (user_restaurants.restaurant_id = reservations.restaurant_id) AND (user_restaurants.is_active = true))))))`
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
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
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
| `slug` | text | NO | - |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `restaurant_info_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION

### Índices

- **idx_restaurant_info_slug**
  ```sql
  CREATE INDEX idx_restaurant_info_slug ON public.restaurant_info USING btree (slug)
  ```
- **idx_restaurant_info_tenant**
  ```sql
  CREATE INDEX idx_restaurant_info_tenant ON public.restaurant_info USING btree (tenant_id)
  ```
- **idx_restaurant_info_tenant_slug**
  ```sql
  CREATE UNIQUE INDEX idx_restaurant_info_tenant_slug ON public.restaurant_info USING btree (tenant_id, slug)
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
- **Users can view restaurants they have access to** (SELECT) - PERMISSIVE
  - USING: `((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (tenant_users.is_active = true)))) OR (id IN ( SELECT user_restaurants.restaurant_id
   FROM user_restaurants
  WHERE ((user_restaurants.auth_user_id = auth.uid()) AND (user_restaurants.is_active = true)))))`

### Triggers

- **trigger_update_restaurant_count**
  - Timing: AFTER
  - Event: INSERT
  - Action: `EXECUTE FUNCTION update_restaurant_count()`
- **trigger_update_restaurant_count**
  - Timing: AFTER
  - Event: DELETE
  - Action: `EXECUTE FUNCTION update_restaurant_count()`
- **trigger_update_restaurant_count**
  - Timing: AFTER
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION update_restaurant_count()`

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
| `restaurant_id` | uuid | YES | - |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `fk_session_state_restaurant`
  - ON UPDATE: NO ACTION, ON DELETE: SET NULL

### Índices

- **idx_session_state_restaurant_id**
  ```sql
  CREATE INDEX idx_session_state_restaurant_id ON public.session_state USING btree (restaurant_id) WHERE (restaurant_id IS NOT NULL)
  ```
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
| `is_multi_restaurant` | boolean | YES | false |  | - |
| `restaurant_count` | integer | YES | 1 |  | - |

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

## Tabla: `user_restaurants`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | uuid_generate_v4() | 🔑 | - |
| `auth_user_id` | uuid | NO | - |  | - |
| `tenant_id` | uuid | NO | - |  | - |
| `restaurant_id` | uuid | NO | - |  | - |
| `role` | text | NO | - |  | - |
| `is_active` | boolean | YES | true |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |
| `updated_at` | timestamp with time zone | YES | now() |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `user_restaurants_restaurant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `user_restaurants_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **idx_user_restaurants_restaurant**
  ```sql
  CREATE INDEX idx_user_restaurants_restaurant ON public.user_restaurants USING btree (restaurant_id) WHERE (is_active = true)
  ```
- **idx_user_restaurants_tenant**
  ```sql
  CREATE INDEX idx_user_restaurants_tenant ON public.user_restaurants USING btree (tenant_id) WHERE (is_active = true)
  ```
- **idx_user_restaurants_user**
  ```sql
  CREATE INDEX idx_user_restaurants_user ON public.user_restaurants USING btree (auth_user_id) WHERE (is_active = true)
  ```
- **user_restaurants_auth_user_id_restaurant_id_key**
  ```sql
  CREATE UNIQUE INDEX user_restaurants_auth_user_id_restaurant_id_key ON public.user_restaurants USING btree (auth_user_id, restaurant_id)
  ```

### Políticas RLS (Row Level Security)

- **Owners can manage restaurant assignments** (ALL) - PERMISSIVE
  - USING: `(tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE ((tenant_users.auth_user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (tenant_users.is_active = true))))`
- **Users can view own restaurant assignments** (SELECT) - PERMISSIVE
  - USING: `(auth_user_id = auth.uid())`

### Triggers

- **update_user_restaurants_updated_at**
  - Timing: BEFORE
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION update_updated_at_column()`

---

## Funciones de Base de Datos

Total de funciones: **8**

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

### `get_restaurant_by_whatsapp(p_whatsapp_number text)`

**Returns**: `TABLE(id uuid, tenant_id uuid, name text, slug text)`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_restaurant_by_whatsapp(p_whatsapp_number text)
 RETURNS TABLE(id uuid, tenant_id uuid, name text, slug text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ri.id,
    ri.tenant_id,
    ri.name,
    ri.slug
  FROM restaurant_info ri
  WHERE ri.phone = p_whatsapp_number
  LIMIT 1;
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

### `get_user_accessible_restaurants(p_user_id uuid, p_tenant_id uuid)`

Devuelve lista de restaurantes a los que un usuario tiene acceso. Owners/admins ven todos.

**Returns**: `TABLE(restaurant_id uuid, user_role text)`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_user_accessible_restaurants(p_user_id uuid, p_tenant_id uuid)
 RETURNS TABLE(restaurant_id uuid, user_role text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Primero verificar si el usuario es owner/admin del tenant
  -- En ese caso, tiene acceso a TODOS los restaurantes
  IF EXISTS (
    SELECT 1 FROM tenant_users
    WHERE auth_user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true
      AND role IN ('owner', 'admin')
  ) THEN
    -- Devolver TODOS los restaurantes del tenant
    RETURN QUERY
    SELECT
      ri.id AS restaurant_id,
      'owner'::TEXT AS user_role
    FROM restaurant_info ri
    WHERE ri.tenant_id = p_tenant_id;
  ELSE
    -- Devolver solo los restaurantes asignados específicamente
    RETURN QUERY
    SELECT
      ur.restaurant_id,
      ur.role AS user_role
    FROM user_restaurants ur
    WHERE ur.auth_user_id = p_user_id
      AND ur.tenant_id = p_tenant_id
      AND ur.is_active = true;
  END IF;
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

### `update_restaurant_count()`

**Returns**: `trigger`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.update_restaurant_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Actualizar contador en tenants
  UPDATE tenants
  SET
    restaurant_count = (
      SELECT COUNT(*)
      FROM restaurant_info
      WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    ),
    is_multi_restaurant = (
      SELECT COUNT(*) > 1
      FROM restaurant_info
      WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    )
  WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);

  RETURN COALESCE(NEW, OLD);
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

### `user_has_restaurant_access(p_user_id uuid, p_tenant_id uuid, p_restaurant_id uuid)`

Verifica si un usuario tiene acceso a un restaurante específico

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.user_has_restaurant_access(p_user_id uuid, p_tenant_id uuid, p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Owner/Admin del tenant → acceso total
  IF EXISTS (
    SELECT 1 FROM tenant_users
    WHERE auth_user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN true;
  END IF;

  -- Verificar permiso específico sobre el restaurante
  RETURN EXISTS (
    SELECT 1 FROM user_restaurants
    WHERE auth_user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND restaurant_id = p_restaurant_id
      AND is_active = true
  );
END;
$function$

```

</details>

---

