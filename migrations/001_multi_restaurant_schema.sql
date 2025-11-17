-- ============================================================================
-- MIGRACIÓN: Multi-Restaurant Support
-- Versión: 001
-- Fecha: 2025-11-15
-- Descripción: Preparar base de datos para soportar múltiples restaurantes
--              por tenant (cadenas, franquicias, grupos hosteleros)
-- ============================================================================

-- IMPORTANTE: Esta migración es BACKWARDS COMPATIBLE
-- Los tenants con 1 solo restaurante siguen funcionando igual

BEGIN;

-- ============================================================================
-- PASO 1: Renombrar y clarificar tabla restaurant_info
-- ============================================================================

-- 1.1 Renombrar restaurant_id a id para mayor claridad
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_info'
    AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE restaurant_info RENAME COLUMN restaurant_id TO id;
  END IF;
END $$;

-- 1.2 Añadir campo slug para URLs amigables
ALTER TABLE restaurant_info
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 1.3 Generar slugs para registros existentes
UPDATE restaurant_info
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- 1.4 Hacer slug NOT NULL y único por tenant
ALTER TABLE restaurant_info
  ALTER COLUMN slug SET NOT NULL;

-- 1.5 Índice único: un tenant no puede tener dos restaurantes con el mismo slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_restaurant_info_tenant_slug'
  ) THEN
    CREATE UNIQUE INDEX idx_restaurant_info_tenant_slug
      ON restaurant_info(tenant_id, slug);
  END IF;
END $$;

-- 1.6 Índice para búsquedas por slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_restaurant_info_slug'
  ) THEN
    CREATE INDEX idx_restaurant_info_slug
      ON restaurant_info(slug);
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Actualizar tabla tenants
-- ============================================================================

-- 2.1 Añadir flags para multi-restaurant
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_multi_restaurant BOOLEAN DEFAULT false;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS restaurant_count INTEGER DEFAULT 1;

-- 2.2 Calcular restaurant_count inicial
UPDATE tenants t
SET restaurant_count = (
  SELECT COUNT(*)
  FROM restaurant_info ri
  WHERE ri.tenant_id = t.id
);

-- 2.3 Marcar como multi-restaurant si tienen más de 1
UPDATE tenants
SET is_multi_restaurant = true
WHERE restaurant_count > 1;

-- ============================================================================
-- PASO 3: Actualizar tabla reservations
-- ============================================================================

-- 3.1 Añadir columna restaurant_id (nullable por ahora para migración)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 3.2 Backfill: asignar el restaurante del tenant a todas las reservas existentes
UPDATE reservations r
SET restaurant_id = (
  SELECT ri.id
  FROM restaurant_info ri
  WHERE ri.tenant_id = r.tenant_id
  LIMIT 1
)
WHERE r.restaurant_id IS NULL;

-- 3.3 Hacer NOT NULL después de backfill
ALTER TABLE reservations
  ALTER COLUMN restaurant_id SET NOT NULL;

-- 3.4 Añadir foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_reservations_restaurant'
    AND table_name = 'reservations'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT fk_reservations_restaurant
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_info(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3.5 Índice para búsquedas por restaurante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_reservations_restaurant_id'
  ) THEN
    CREATE INDEX idx_reservations_restaurant_id
      ON reservations(restaurant_id);
  END IF;
END $$;

-- 3.6 Índice compuesto para queries comunes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_reservations_restaurant_datetime'
  ) THEN
    CREATE INDEX idx_reservations_restaurant_datetime
      ON reservations(restaurant_id, datetime_utc DESC);
  END IF;
END $$;

-- ============================================================================
-- PASO 4: Actualizar tabla chat_history
-- ============================================================================

-- 4.1 Añadir columna restaurant_id
ALTER TABLE chat_history
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 4.2 Backfill
UPDATE chat_history ch
SET restaurant_id = (
  SELECT ri.id
  FROM restaurant_info ri
  WHERE ri.tenant_id = ch.tenant_id
  LIMIT 1
)
WHERE ch.restaurant_id IS NULL;

-- 4.3 Hacer NOT NULL
ALTER TABLE chat_history
  ALTER COLUMN restaurant_id SET NOT NULL;

-- 4.4 Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_chat_history_restaurant'
    AND table_name = 'chat_history'
  ) THEN
    ALTER TABLE chat_history
      ADD CONSTRAINT fk_chat_history_restaurant
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_info(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4.5 Índice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_chat_history_restaurant_id'
  ) THEN
    CREATE INDEX idx_chat_history_restaurant_id
      ON chat_history(restaurant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_chat_history_restaurant_phone'
  ) THEN
    CREATE INDEX idx_chat_history_restaurant_phone
      ON chat_history(restaurant_id, phone);
  END IF;
END $$;

-- ============================================================================
-- PASO 5: Actualizar tabla session_state
-- ============================================================================

-- 5.1 Añadir columna restaurant_id
ALTER TABLE session_state
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 5.2 Backfill (session_state no tiene tenant_id, usar whatsapp_number)
-- Nota: session_state solo tiene 'phone' como PK, necesitamos otra estrategia
-- Por ahora lo dejamos nullable hasta que tengamos lógica para detectar restaurante

-- 5.3 Foreign key (nullable permitido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_session_state_restaurant'
    AND table_name = 'session_state'
  ) THEN
    ALTER TABLE session_state
      ADD CONSTRAINT fk_session_state_restaurant
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_info(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 5.4 Índice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_session_state_restaurant_id'
  ) THEN
    CREATE INDEX idx_session_state_restaurant_id
      ON session_state(restaurant_id) WHERE restaurant_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- PASO 6: Actualizar tabla conversations
-- ============================================================================

-- 6.1 Añadir columna restaurant_id
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 6.2 Añadir tenant_id para poder hacer backfill
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 6.3 Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_conversations_tenant'
    AND table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT fk_conversations_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_conversations_restaurant'
    AND table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT fk_conversations_restaurant
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_info(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 6.4 Índices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_conversations_tenant_id'
  ) THEN
    CREATE INDEX idx_conversations_tenant_id
      ON conversations(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_conversations_restaurant_id'
  ) THEN
    CREATE INDEX idx_conversations_restaurant_id
      ON conversations(restaurant_id);
  END IF;
END $$;

-- ============================================================================
-- PASO 7: Actualizar políticas RLS
-- ============================================================================

-- 7.1 Actualizar política de reservations para incluir restaurant_id
DROP POLICY IF EXISTS "Portal users can select own reservations" ON reservations;
CREATE POLICY "Portal users can select own reservations" ON reservations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id
      FROM tenant_users
      WHERE tenant_users.auth_user_id = auth.uid()
        AND tenant_users.is_active = true
    )
  );

-- 7.2 Actualizar política de chat_history
DROP POLICY IF EXISTS "Portal users can see chat history of own tenants" ON chat_history;
CREATE POLICY "Portal users can see chat history of own tenants" ON chat_history
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id
      FROM tenant_users
      WHERE tenant_users.auth_user_id = auth.uid()
        AND tenant_users.is_active = true
    )
  );

-- ============================================================================
-- PASO 8: Funciones auxiliares
-- ============================================================================

-- 8.1 Función para actualizar contador de restaurantes
CREATE OR REPLACE FUNCTION update_restaurant_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 8.2 Trigger para mantener el contador actualizado
DROP TRIGGER IF EXISTS trigger_update_restaurant_count ON restaurant_info;
CREATE TRIGGER trigger_update_restaurant_count
  AFTER INSERT OR UPDATE OR DELETE ON restaurant_info
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_count();

-- 8.3 Función para obtener restaurante por WhatsApp
CREATE OR REPLACE FUNCTION get_restaurant_by_whatsapp(p_whatsapp_number TEXT)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  slug TEXT
) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PASO 9: Vistas útiles
-- ============================================================================

-- 9.1 Vista para estadísticas de restaurantes por tenant
CREATE OR REPLACE VIEW v_tenant_restaurant_stats AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.restaurant_count,
  t.is_multi_restaurant,
  COUNT(DISTINCT r.id) AS total_reservations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') AS reservations_last_30_days
FROM tenants t
LEFT JOIN restaurant_info ri ON ri.tenant_id = t.id
LEFT JOIN reservations r ON r.restaurant_id = ri.id
GROUP BY t.id, t.name, t.restaurant_count, t.is_multi_restaurant;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  v_reservations_without_restaurant INT;
  v_chat_without_restaurant INT;
BEGIN
  -- Verificar que todas las reservas tienen restaurant_id
  SELECT COUNT(*) INTO v_reservations_without_restaurant
  FROM reservations WHERE restaurant_id IS NULL;

  IF v_reservations_without_restaurant > 0 THEN
    RAISE WARNING 'ADVERTENCIA: % reservas sin restaurant_id', v_reservations_without_restaurant;
  ELSE
    RAISE NOTICE '✅ Todas las reservas tienen restaurant_id';
  END IF;

  -- Verificar chat_history
  SELECT COUNT(*) INTO v_chat_without_restaurant
  FROM chat_history WHERE restaurant_id IS NULL;

  IF v_chat_without_restaurant > 0 THEN
    RAISE WARNING 'ADVERTENCIA: % mensajes de chat sin restaurant_id', v_chat_without_restaurant;
  ELSE
    RAISE NOTICE '✅ Todos los mensajes de chat tienen restaurant_id';
  END IF;

  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE 'Total de tenants: %', (SELECT COUNT(*) FROM tenants);
  RAISE NOTICE 'Total de restaurantes: %', (SELECT COUNT(*) FROM restaurant_info);
  RAISE NOTICE 'Tenants multi-restaurant: %', (SELECT COUNT(*) FROM tenants WHERE is_multi_restaurant = true);
END $$;

COMMIT;

-- ============================================================================
-- NOTAS POST-MIGRACIÓN
-- ============================================================================

-- 1. Actualizar código del bot para detectar restaurant_id desde WhatsApp
-- 2. Actualizar portal para permitir gestión de múltiples restaurantes
-- 3. Actualizar queries para incluir restaurant_id en filtros
-- 4. Considerar añadir campo 'whatsapp_number' a restaurant_info
--    (actualmente está en 'phone', renombrar para claridad)

-- Para ver el resultado:
-- SELECT * FROM v_tenant_restaurant_stats;
