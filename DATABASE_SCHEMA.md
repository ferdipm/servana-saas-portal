# Esquema de Base de Datos - Supabase

> Documentación generada automáticamente el 22/12/2025, 2:29:16

## Información General

- **Supabase URL**: https://gfltxcyvdmknwklcycyo.supabase.co
- **Project Ref**: gfltxcyvdmknwklcycyo
- **Esquema**: public
- **Generado con**: Conexión directa a PostgreSQL

---

## Resumen de Tablas

Total de tablas: **11**

- [`chat_history`](#tabla-chat_history) (7 columnas)
- [`conversations`](#tabla-conversations) (8 columnas)
- [`customers`](#tabla-customers) (14 columnas)
- [`knowledge_usage`](#tabla-knowledge_usage) (8 columnas)
- [`reservations`](#tabla-reservations) (21 columnas)
- [`restaurant_info`](#tabla-restaurant_info) (25 columnas)
- [`restaurant_knowledge_chunks`](#tabla-restaurant_knowledge_chunks) (12 columnas)
- [`session_state`](#tabla-session_state) (10 columnas)
- [`tenant_users`](#tabla-tenant_users) (10 columnas)
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

## Tabla: `customers`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `tenant_id` | uuid | NO | - |  | - |
| `restaurant_id` | uuid | NO | - |  | - |
| `phone` | character varying | NO | - |  | 30 |
| `name` | character varying | YES | - |  | 150 |
| `email` | character varying | YES | - |  | 255 |
| `preferred_language` | character varying | YES | - |  | 10 |
| `notes` | text | YES | - |  | - |
| `total_reservations` | integer | YES | 0 |  | - |
| `total_no_shows` | integer | YES | 0 |  | - |
| `total_cancellations` | integer | YES | 0 |  | - |
| `last_visit_at` | timestamp with time zone | YES | - |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |
| `updated_at` | timestamp with time zone | YES | now() |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `customers_restaurant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `customers_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **customers_restaurant_id_phone_key**
  ```sql
  CREATE UNIQUE INDEX customers_restaurant_id_phone_key ON public.customers USING btree (restaurant_id, phone)
  ```
- **idx_customers_phone**
  ```sql
  CREATE INDEX idx_customers_phone ON public.customers USING btree (phone)
  ```
- **idx_customers_restaurant_phone**
  ```sql
  CREATE INDEX idx_customers_restaurant_phone ON public.customers USING btree (restaurant_id, phone)
  ```
- **idx_customers_tenant**
  ```sql
  CREATE INDEX idx_customers_tenant ON public.customers USING btree (tenant_id)
  ```

### Políticas RLS (Row Level Security)

- **customers_allow_all** (ALL) - PERMISSIVE
  - USING: `true`

### Triggers

- **trigger_customers_updated_at**
  - Timing: BEFORE
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION update_customers_updated_at()`

---

## Tabla: `knowledge_usage`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `tenant_id` | uuid | NO | - |  | - |
| `restaurant_id` | uuid | NO | - |  | - |
| `chunk_id` | uuid | YES | - |  | - |
| `query` | text | NO | - |  | - |
| `used_in_response` | boolean | YES | false |  | - |
| `similarity_score` | double precision | YES | - |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |

### Relaciones (Foreign Keys)

- `chunk_id` → [`restaurant_knowledge_chunks.id`](#tabla-restaurant_knowledge_chunks)
  - Constraint: `knowledge_usage_chunk_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: SET NULL
- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `knowledge_usage_restaurant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `knowledge_usage_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **idx_knowledge_usage_created**
  ```sql
  CREATE INDEX idx_knowledge_usage_created ON public.knowledge_usage USING btree (created_at)
  ```
- **idx_knowledge_usage_restaurant**
  ```sql
  CREATE INDEX idx_knowledge_usage_restaurant ON public.knowledge_usage USING btree (restaurant_id)
  ```

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
| `confirmation_status` | text | YES | 'not_required'::text |  | - |
| `confirmation_sent_at` | timestamp with time zone | YES | - |  | - |
| `confirmation_replied_at` | timestamp with time zone | YES | - |  | - |
| `checkin_token` | text | YES | - |  | - |
| `customer_id` | uuid | YES | - |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `fk_reservations_restaurant`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
- `customer_id` → [`customers.id`](#tabla-customers)
  - Constraint: `reservations_customer_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: SET NULL
- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `reservations_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION

### Índices

- **idx_reservations_analytics**
  ```sql
  CREATE INDEX idx_reservations_analytics ON public.reservations USING btree (restaurant_id, datetime_utc, status) WHERE (status = ANY (ARRAY['confirmed'::text, 'seated'::text, 'finished'::text]))
  ```
- **idx_reservations_business**
  ```sql
  CREATE INDEX idx_reservations_business ON public.reservations USING btree (business_id)
  ```
- **idx_reservations_business_id**
  ```sql
  CREATE INDEX idx_reservations_business_id ON public.reservations USING btree (business_id)
  ```
- **idx_reservations_checkin_token**
  ```sql
  CREATE INDEX idx_reservations_checkin_token ON public.reservations USING btree (checkin_token) WHERE (checkin_token IS NOT NULL)
  ```
- **idx_reservations_confirmation_lookup**
  ```sql
  CREATE INDEX idx_reservations_confirmation_lookup ON public.reservations USING btree (restaurant_id, datetime_utc, confirmation_status) WHERE (status = 'confirmed'::text)
  ```
- **idx_reservations_confirmation_status**
  ```sql
  CREATE INDEX idx_reservations_confirmation_status ON public.reservations USING btree (confirmation_status) WHERE (confirmation_status = 'pending'::text)
  ```
- **idx_reservations_customer**
  ```sql
  CREATE INDEX idx_reservations_customer ON public.reservations USING btree (customer_id)
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
- **idx_reservations_source_analytics**
  ```sql
  CREATE INDEX idx_reservations_source_analytics ON public.reservations USING btree (restaurant_id, source, datetime_utc) WHERE (status = ANY (ARRAY['confirmed'::text, 'seated'::text, 'finished'::text]))
  ```
- **idx_reservations_status**
  ```sql
  CREATE INDEX idx_reservations_status ON public.reservations USING btree (status)
  ```
- **idx_reservations_tenant**
  ```sql
  CREATE INDEX idx_reservations_tenant ON public.reservations USING btree (tenant_id)
  ```
- **idx_reservations_tenant_date**
  ```sql
  CREATE INDEX idx_reservations_tenant_date ON public.reservations USING btree (tenant_id, datetime_utc, status)
  ```
- **reservations_checkin_token_key**
  ```sql
  CREATE UNIQUE INDEX reservations_checkin_token_key ON public.reservations USING btree (checkin_token)
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

- **trigger_update_customer_stats**
  - Timing: AFTER
  - Event: INSERT
  - Action: `EXECUTE FUNCTION update_customer_stats()`
- **trigger_update_customer_stats**
  - Timing: AFTER
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION update_customer_stats()`

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
| `logo_url` | text | YES | - |  | - |
| `special_days` | jsonb | YES | '[]'::jsonb |  | - |
| `whatsapp_number` | text | YES | - |  | - |
| `set_menus` | jsonb | YES | '[]'::jsonb |  | - |
| `wine_menu` | jsonb | YES | '{"categories": []}'::jsonb |  | - |
| `notification_settings` | jsonb | YES | '{"reminder_24h_enabled": true, "confirmation_required": true, "notify_on_cancellation": true, "notify_on_new_reservation": false}'::jsonb |  | - |
| `total_capacity` | integer | YES | 50 |  | - |
| `bot_settings` | jsonb | YES | '{"reservation_mode": "auto_confirm"}'::jsonb |  | - |

### Relaciones (Foreign Keys)

- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `restaurant_info_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: NO ACTION

### Índices

- **idx_restaurant_info_slug**
  ```sql
  CREATE INDEX idx_restaurant_info_slug ON public.restaurant_info USING btree (slug)
  ```
- **idx_restaurant_info_special_days**
  ```sql
  CREATE INDEX idx_restaurant_info_special_days ON public.restaurant_info USING gin (special_days)
  ```
- **idx_restaurant_info_tenant**
  ```sql
  CREATE INDEX idx_restaurant_info_tenant ON public.restaurant_info USING btree (tenant_id)
  ```
- **idx_restaurant_info_tenant_slug**
  ```sql
  CREATE UNIQUE INDEX idx_restaurant_info_tenant_slug ON public.restaurant_info USING btree (tenant_id, slug)
  ```
- **idx_restaurant_info_whatsapp**
  ```sql
  CREATE INDEX idx_restaurant_info_whatsapp ON public.restaurant_info USING btree (whatsapp_number) WHERE (whatsapp_number IS NOT NULL)
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

## Tabla: `restaurant_knowledge_chunks`

### Columnas

| Columna | Tipo | Nullable | Default | PK | Longitud Max |
|---------|------|----------|---------|----|--------------|
| `id` | uuid | NO | gen_random_uuid() | 🔑 | - |
| `tenant_id` | uuid | NO | - |  | - |
| `restaurant_id` | uuid | NO | - |  | - |
| `kind` | text | NO | - |  | - |
| `content` | text | NO | - |  | - |
| `metadata` | jsonb | YES | '{}'::jsonb |  | - |
| `embedding` | USER-DEFINED | YES | - |  | - |
| `popularity_score` | numeric | YES | 0 |  | - |
| `version` | integer | YES | 1 |  | - |
| `is_current` | boolean | YES | true |  | - |
| `created_at` | timestamp with time zone | YES | now() |  | - |
| `updated_at` | timestamp with time zone | YES | now() |  | - |

### Relaciones (Foreign Keys)

- `restaurant_id` → [`restaurant_info.id`](#tabla-restaurant_info)
  - Constraint: `restaurant_knowledge_chunks_restaurant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE
- `tenant_id` → [`tenants.id`](#tabla-tenants)
  - Constraint: `restaurant_knowledge_chunks_tenant_id_fkey`
  - ON UPDATE: NO ACTION, ON DELETE: CASCADE

### Índices

- **idx_knowledge_chunks_current**
  ```sql
  CREATE INDEX idx_knowledge_chunks_current ON public.restaurant_knowledge_chunks USING btree (is_current) WHERE (is_current = true)
  ```
- **idx_knowledge_chunks_embedding**
  ```sql
  CREATE INDEX idx_knowledge_chunks_embedding ON public.restaurant_knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100')
  ```
- **idx_knowledge_chunks_kind**
  ```sql
  CREATE INDEX idx_knowledge_chunks_kind ON public.restaurant_knowledge_chunks USING btree (kind)
  ```
- **idx_knowledge_chunks_restaurant**
  ```sql
  CREATE INDEX idx_knowledge_chunks_restaurant ON public.restaurant_knowledge_chunks USING btree (restaurant_id)
  ```
- **idx_knowledge_chunks_tenant**
  ```sql
  CREATE INDEX idx_knowledge_chunks_tenant ON public.restaurant_knowledge_chunks USING btree (tenant_id)
  ```

### Políticas RLS (Row Level Security)

- **Service role has full access to knowledge chunks** (ALL) - PERMISSIVE
  - USING: `(auth.role() = 'service_role'::text)`
  - WITH CHECK: `(auth.role() = 'service_role'::text)`

### Triggers

- **trigger_update_knowledge_chunks_timestamp**
  - Timing: BEFORE
  - Event: UPDATE
  - Action: `EXECUTE FUNCTION update_knowledge_chunks_updated_at()`

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
| `username` | text | YES | - |  | - |
| `display_name` | text | YES | - |  | - |

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
- **tenant_users_username_idx**
  ```sql
  CREATE INDEX tenant_users_username_idx ON public.tenant_users USING btree (username) WHERE (username IS NOT NULL)
  ```
- **tenant_users_username_unique_idx**
  ```sql
  CREATE UNIQUE INDEX tenant_users_username_unique_idx ON public.tenant_users USING btree (tenant_id, username) WHERE (username IS NOT NULL)
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

Total de funciones: **128**

### `array_to_halfvec(numeric[], integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(numeric[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

</details>

---

### `array_to_halfvec(integer[], integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(integer[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

</details>

---

### `array_to_halfvec(real[], integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(real[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

</details>

---

### `array_to_halfvec(double precision[], integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(double precision[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

</details>

---

### `array_to_sparsevec(double precision[], integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(double precision[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

</details>

---

### `array_to_sparsevec(integer[], integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(integer[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

</details>

---

### `array_to_sparsevec(real[], integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(real[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

</details>

---

### `array_to_sparsevec(numeric[], integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(numeric[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

</details>

---

### `array_to_vector(integer[], integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(integer[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

</details>

---

### `array_to_vector(numeric[], integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(numeric[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

</details>

---

### `array_to_vector(double precision[], integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(double precision[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

</details>

---

### `array_to_vector(real[], integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(real[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

</details>

---

### `binary_quantize(halfvec)`

**Returns**: `bit`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.binary_quantize(halfvec)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_binary_quantize$function$

```

</details>

---

### `binary_quantize(vector)`

**Returns**: `bit`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.binary_quantize(vector)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$binary_quantize$function$

```

</details>

---

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

### `cosine_distance(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.cosine_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cosine_distance$function$

```

</details>

---

### `cosine_distance(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.cosine_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$cosine_distance$function$

```

</details>

---

### `cosine_distance(sparsevec, sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.cosine_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cosine_distance$function$

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
  WHERE ri.whatsapp_number = p_whatsapp_number
     OR ri.whatsapp_number = 'whatsapp:' || p_whatsapp_number
     OR ri.whatsapp_number = REPLACE(p_whatsapp_number, 'whatsapp:', '')
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

### `halfvec(halfvec, integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec(halfvec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec$function$

```

</details>

---

### `halfvec_accum(double precision[], halfvec)`

**Returns**: `double precision[]`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_accum(double precision[], halfvec)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_accum$function$

```

</details>

---

### `halfvec_add(halfvec, halfvec)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_add(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_add$function$

```

</details>

---

### `halfvec_avg(double precision[])`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_avg(double precision[])
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_avg$function$

```

</details>

---

### `halfvec_cmp(halfvec, halfvec)`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_cmp(halfvec, halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cmp$function$

```

</details>

---

### `halfvec_combine(double precision[], double precision[])`

**Returns**: `double precision[]`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$

```

</details>

---

### `halfvec_concat(halfvec, halfvec)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_concat(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_concat$function$

```

</details>

---

### `halfvec_eq(halfvec, halfvec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_eq(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_eq$function$

```

</details>

---

### `halfvec_ge(halfvec, halfvec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_ge(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ge$function$

```

</details>

---

### `halfvec_gt(halfvec, halfvec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_gt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_gt$function$

```

</details>

---

### `halfvec_in(cstring, oid, integer)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_in(cstring, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_in$function$

```

</details>

---

### `halfvec_l2_squared_distance(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_l2_squared_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_squared_distance$function$

```

</details>

---

### `halfvec_le(halfvec, halfvec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_le(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_le$function$

```

</details>

---

### `halfvec_lt(halfvec, halfvec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_lt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_lt$function$

```

</details>

---

### `halfvec_mul(halfvec, halfvec)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_mul(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_mul$function$

```

</details>

---

### `halfvec_ne(halfvec, halfvec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_ne(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ne$function$

```

</details>

---

### `halfvec_negative_inner_product(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_negative_inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_negative_inner_product$function$

```

</details>

---

### `halfvec_out(halfvec)`

**Returns**: `cstring`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_out(halfvec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_out$function$

```

</details>

---

### `halfvec_recv(internal, oid, integer)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_recv(internal, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_recv$function$

```

</details>

---

### `halfvec_send(halfvec)`

**Returns**: `bytea`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_send(halfvec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_send$function$

```

</details>

---

### `halfvec_spherical_distance(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_spherical_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_spherical_distance$function$

```

</details>

---

### `halfvec_sub(halfvec, halfvec)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_sub(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_sub$function$

```

</details>

---

### `halfvec_to_float4(halfvec, integer, boolean)`

**Returns**: `real[]`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_to_float4(halfvec, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_float4$function$

```

</details>

---

### `halfvec_to_sparsevec(halfvec, integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_to_sparsevec(halfvec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_sparsevec$function$

```

</details>

---

### `halfvec_to_vector(halfvec, integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_to_vector(halfvec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_vector$function$

```

</details>

---

### `halfvec_typmod_in(cstring[])`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.halfvec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_typmod_in$function$

```

</details>

---

### `hamming_distance(bit, bit)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.hamming_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$hamming_distance$function$

```

</details>

---

### `hnsw_bit_support(internal)`

**Returns**: `internal`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.hnsw_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_bit_support$function$

```

</details>

---

### `hnsw_halfvec_support(internal)`

**Returns**: `internal`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.hnsw_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_halfvec_support$function$

```

</details>

---

### `hnsw_sparsevec_support(internal)`

**Returns**: `internal`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.hnsw_sparsevec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_sparsevec_support$function$

```

</details>

---

### `hnswhandler(internal)`

**Returns**: `index_am_handler`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.hnswhandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$hnswhandler$function$

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

### `inner_product(sparsevec, sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_inner_product$function$

```

</details>

---

### `inner_product(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_inner_product$function$

```

</details>

---

### `inner_product(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$inner_product$function$

```

</details>

---

### `invalidate_knowledge_chunks(p_restaurant_id uuid, p_kind text DEFAULT NULL::text)`

**Returns**: `void`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.invalidate_knowledge_chunks(p_restaurant_id uuid, p_kind text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE restaurant_knowledge_chunks
  SET
    is_current = false,
    updated_at = NOW()
  WHERE
    restaurant_id = p_restaurant_id
    AND is_current = true
    AND (p_kind IS NULL OR kind = p_kind);
END;
$function$

```

</details>

---

### `ivfflat_bit_support(internal)`

**Returns**: `internal`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.ivfflat_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_bit_support$function$

```

</details>

---

### `ivfflat_halfvec_support(internal)`

**Returns**: `internal`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.ivfflat_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_halfvec_support$function$

```

</details>

---

### `ivfflathandler(internal)`

**Returns**: `index_am_handler`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.ivfflathandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$ivfflathandler$function$

```

</details>

---

### `jaccard_distance(bit, bit)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.jaccard_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$jaccard_distance$function$

```

</details>

---

### `l1_distance(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l1_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l1_distance$function$

```

</details>

---

### `l1_distance(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l1_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l1_distance$function$

```

</details>

---

### `l1_distance(sparsevec, sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l1_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l1_distance$function$

```

</details>

---

### `l2_distance(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_distance$function$

```

</details>

---

### `l2_distance(halfvec, halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_distance$function$

```

</details>

---

### `l2_distance(sparsevec, sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_distance$function$

```

</details>

---

### `l2_norm(sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_norm(sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_norm$function$

```

</details>

---

### `l2_norm(halfvec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_norm(halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_norm$function$

```

</details>

---

### `l2_normalize(sparsevec)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_normalize(sparsevec)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_normalize$function$

```

</details>

---

### `l2_normalize(vector)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_normalize(vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_normalize$function$

```

</details>

---

### `l2_normalize(halfvec)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.l2_normalize(halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_normalize$function$

```

</details>

---

### `search_knowledge(p_restaurant_id uuid, p_query_embedding vector, p_kind text DEFAULT NULL::text, p_limit integer DEFAULT 5, p_similarity_threshold double precision DEFAULT 0.5)`

**Returns**: `TABLE(id uuid, kind text, content text, metadata jsonb, popularity_score numeric, similarity double precision)`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.search_knowledge(p_restaurant_id uuid, p_query_embedding vector, p_kind text DEFAULT NULL::text, p_limit integer DEFAULT 5, p_similarity_threshold double precision DEFAULT 0.5)
 RETURNS TABLE(id uuid, kind text, content text, metadata jsonb, popularity_score numeric, similarity double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rkc.id,
    rkc.kind,
    rkc.content,
    rkc.metadata,
    rkc.popularity_score,
    1 - (rkc.embedding <=> p_query_embedding) AS similarity
  FROM restaurant_knowledge_chunks rkc
  WHERE
    rkc.restaurant_id = p_restaurant_id
    AND rkc.is_current = true
    AND rkc.embedding IS NOT NULL
    AND (p_kind IS NULL OR rkc.kind = p_kind)
    AND (1 - (rkc.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY
    -- Combinar similitud semántica con popularidad
    (1 - (rkc.embedding <=> p_query_embedding)) * 0.8 + rkc.popularity_score * 0.2 DESC
  LIMIT p_limit;
END;
$function$

```

</details>

---

### `search_knowledge_text(p_restaurant_id uuid, p_query text, p_kind text DEFAULT NULL::text, p_limit integer DEFAULT 5)`

**Returns**: `TABLE(id uuid, kind text, content text, metadata jsonb, popularity_score numeric, rank double precision)`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.search_knowledge_text(p_restaurant_id uuid, p_query text, p_kind text DEFAULT NULL::text, p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, kind text, content text, metadata jsonb, popularity_score numeric, rank double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rkc.id,
    rkc.kind,
    rkc.content,
    rkc.metadata,
    rkc.popularity_score,
    ts_rank(to_tsvector('spanish', rkc.content), plainto_tsquery('spanish', p_query)) AS rank
  FROM restaurant_knowledge_chunks rkc
  WHERE
    rkc.restaurant_id = p_restaurant_id
    AND rkc.is_current = true
    AND (p_kind IS NULL OR rkc.kind = p_kind)
    AND to_tsvector('spanish', rkc.content) @@ plainto_tsquery('spanish', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$function$

```

</details>

---

### `sparsevec(sparsevec, integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec(sparsevec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec$function$

```

</details>

---

### `sparsevec_cmp(sparsevec, sparsevec)`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_cmp(sparsevec, sparsevec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cmp$function$

```

</details>

---

### `sparsevec_eq(sparsevec, sparsevec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_eq(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_eq$function$

```

</details>

---

### `sparsevec_ge(sparsevec, sparsevec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_ge(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ge$function$

```

</details>

---

### `sparsevec_gt(sparsevec, sparsevec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_gt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_gt$function$

```

</details>

---

### `sparsevec_in(cstring, oid, integer)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_in(cstring, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_in$function$

```

</details>

---

### `sparsevec_l2_squared_distance(sparsevec, sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_l2_squared_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_squared_distance$function$

```

</details>

---

### `sparsevec_le(sparsevec, sparsevec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_le(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_le$function$

```

</details>

---

### `sparsevec_lt(sparsevec, sparsevec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_lt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_lt$function$

```

</details>

---

### `sparsevec_ne(sparsevec, sparsevec)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_ne(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ne$function$

```

</details>

---

### `sparsevec_negative_inner_product(sparsevec, sparsevec)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_negative_inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_negative_inner_product$function$

```

</details>

---

### `sparsevec_out(sparsevec)`

**Returns**: `cstring`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_out(sparsevec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_out$function$

```

</details>

---

### `sparsevec_recv(internal, oid, integer)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_recv(internal, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_recv$function$

```

</details>

---

### `sparsevec_send(sparsevec)`

**Returns**: `bytea`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_send(sparsevec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_send$function$

```

</details>

---

### `sparsevec_to_halfvec(sparsevec, integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_to_halfvec(sparsevec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_halfvec$function$

```

</details>

---

### `sparsevec_to_vector(sparsevec, integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_to_vector(sparsevec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_vector$function$

```

</details>

---

### `sparsevec_typmod_in(cstring[])`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_typmod_in$function$

```

</details>

---

### `subvector(halfvec, integer, integer)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.subvector(halfvec, integer, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_subvector$function$

```

</details>

---

### `subvector(vector, integer, integer)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.subvector(vector, integer, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$subvector$function$

```

</details>

---

### `update_customer_stats()`

**Returns**: `trigger`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.update_customer_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update total_reservations count
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_reservations = total_reservations + 1,
        updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  -- Update no-show count when status changes to no_show
  IF TG_OP = 'UPDATE' AND NEW.status = 'no_show' AND OLD.status != 'no_show' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_no_shows = total_no_shows + 1,
        updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  -- Update cancellation count when status changes to canceled
  IF TG_OP = 'UPDATE' AND NEW.status = 'canceled' AND OLD.status != 'canceled' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_cancellations = total_cancellations + 1,
        updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  -- Update last_visit_at when checked in
  IF TG_OP = 'UPDATE' AND NEW.status = 'seated' AND OLD.status != 'seated' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET last_visit_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$function$

```

</details>

---

### `update_customers_updated_at()`

**Returns**: `trigger`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
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

### `update_knowledge_chunks_updated_at()`

**Returns**: `trigger`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.update_knowledge_chunks_updated_at()
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

### `vector(vector, integer, boolean)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector(vector, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector$function$

```

</details>

---

### `vector_accum(double precision[], vector)`

**Returns**: `double precision[]`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_accum(double precision[], vector)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_accum$function$

```

</details>

---

### `vector_add(vector, vector)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_add(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_add$function$

```

</details>

---

### `vector_avg(double precision[])`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_avg(double precision[])
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_avg$function$

```

</details>

---

### `vector_cmp(vector, vector)`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_cmp(vector, vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_cmp$function$

```

</details>

---

### `vector_combine(double precision[], double precision[])`

**Returns**: `double precision[]`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$

```

</details>

---

### `vector_concat(vector, vector)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_concat(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_concat$function$

```

</details>

---

### `vector_dims(halfvec)`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_dims(halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_vector_dims$function$

```

</details>

---

### `vector_dims(vector)`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_dims(vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_dims$function$

```

</details>

---

### `vector_eq(vector, vector)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_eq(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_eq$function$

```

</details>

---

### `vector_ge(vector, vector)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_ge(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ge$function$

```

</details>

---

### `vector_gt(vector, vector)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_gt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_gt$function$

```

</details>

---

### `vector_in(cstring, oid, integer)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_in(cstring, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_in$function$

```

</details>

---

### `vector_l2_squared_distance(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_l2_squared_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_l2_squared_distance$function$

```

</details>

---

### `vector_le(vector, vector)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_le(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_le$function$

```

</details>

---

### `vector_lt(vector, vector)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_lt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_lt$function$

```

</details>

---

### `vector_mul(vector, vector)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_mul(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_mul$function$

```

</details>

---

### `vector_ne(vector, vector)`

**Returns**: `boolean`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_ne(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ne$function$

```

</details>

---

### `vector_negative_inner_product(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_negative_inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_negative_inner_product$function$

```

</details>

---

### `vector_norm(vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_norm(vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_norm$function$

```

</details>

---

### `vector_out(vector)`

**Returns**: `cstring`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_out(vector)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_out$function$

```

</details>

---

### `vector_recv(internal, oid, integer)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_recv(internal, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_recv$function$

```

</details>

---

### `vector_send(vector)`

**Returns**: `bytea`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_send(vector)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_send$function$

```

</details>

---

### `vector_spherical_distance(vector, vector)`

**Returns**: `double precision`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_spherical_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_spherical_distance$function$

```

</details>

---

### `vector_sub(vector, vector)`

**Returns**: `vector`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_sub(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_sub$function$

```

</details>

---

### `vector_to_float4(vector, integer, boolean)`

**Returns**: `real[]`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_to_float4(vector, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_float4$function$

```

</details>

---

### `vector_to_halfvec(vector, integer, boolean)`

**Returns**: `halfvec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_to_halfvec(vector, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_halfvec$function$

```

</details>

---

### `vector_to_sparsevec(vector, integer, boolean)`

**Returns**: `sparsevec`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_to_sparsevec(vector, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_sparsevec$function$

```

</details>

---

### `vector_typmod_in(cstring[])`

**Returns**: `integer`

<details>
<summary>Ver definición</summary>

```sql
CREATE OR REPLACE FUNCTION public.vector_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_typmod_in$function$

```

</details>

---

