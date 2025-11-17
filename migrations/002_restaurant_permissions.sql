-- ============================================================================
-- MIGRACIÓN: Restaurant-Level Permissions
-- Versión: 002
-- Fecha: 2025-01-17
-- Descripción: Sistema de permisos a nivel de restaurante para control granular
--              de acceso. Permite que usuarios tengan acceso a restaurantes
--              específicos con roles diferenciados.
-- ============================================================================

-- IMPORTANTE: Esta migración es BACKWARDS COMPATIBLE
-- Los usuarios con role='owner' o 'admin' en tenant_users siguen viendo todo

BEGIN;

-- ============================================================================
-- PASO 1: Crear tabla user_restaurants
-- ============================================================================

-- 1.1 Crear la tabla de permisos por restaurante
CREATE TABLE IF NOT EXISTS user_restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurant_info(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'staff', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario no puede tener el mismo restaurante asignado dos veces
  UNIQUE(auth_user_id, restaurant_id)
);

-- 1.2 Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user
  ON user_restaurants(auth_user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant
  ON user_restaurants(restaurant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_restaurants_tenant
  ON user_restaurants(tenant_id) WHERE is_active = true;

-- 1.3 Comentarios para documentación
COMMENT ON TABLE user_restaurants IS 'Permisos de usuarios a nivel de restaurante. Permite control granular de acceso.';
COMMENT ON COLUMN user_restaurants.role IS 'manager: gestión completa, staff: operaciones, viewer: solo lectura';

-- ============================================================================
-- PASO 2: Función para obtener restaurantes accesibles por usuario
-- ============================================================================

-- 2.1 Función que devuelve los restaurant_ids a los que un usuario tiene acceso
CREATE OR REPLACE FUNCTION get_user_accessible_restaurants(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE (restaurant_id UUID, user_role TEXT) AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2.2 Comentario
COMMENT ON FUNCTION get_user_accessible_restaurants IS 'Devuelve lista de restaurantes a los que un usuario tiene acceso. Owners/admins ven todos.';

-- ============================================================================
-- PASO 3: Función para verificar permiso sobre un restaurante
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_restaurant_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_restaurant_id UUID
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION user_has_restaurant_access IS 'Verifica si un usuario tiene acceso a un restaurante específico';

-- ============================================================================
-- PASO 4: Actualizar políticas RLS
-- ============================================================================

-- 4.1 Habilitar RLS en user_restaurants
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

-- 4.2 Política: Los usuarios solo ven sus propias asignaciones
DROP POLICY IF EXISTS "Users can view own restaurant assignments" ON user_restaurants;
CREATE POLICY "Users can view own restaurant assignments" ON user_restaurants
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- 4.3 Política: Solo owners/admins pueden insertar asignaciones
DROP POLICY IF EXISTS "Owners can manage restaurant assignments" ON user_restaurants;
CREATE POLICY "Owners can manage restaurant assignments" ON user_restaurants
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- 4.4 Actualizar política de reservations para respetar permisos de restaurante
DROP POLICY IF EXISTS "Portal users can select own reservations" ON reservations;
CREATE POLICY "Portal users can select own reservations" ON reservations
  FOR SELECT
  USING (
    -- El usuario debe tener acceso al tenant
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND is_active = true
    )
    AND (
      -- Y debe ser owner/admin del tenant, O tener permiso sobre ese restaurante
      EXISTS (
        SELECT 1 FROM tenant_users
        WHERE auth_user_id = auth.uid()
          AND tenant_id = reservations.tenant_id
          AND role IN ('owner', 'admin')
          AND is_active = true
      )
      OR
      EXISTS (
        SELECT 1 FROM user_restaurants
        WHERE auth_user_id = auth.uid()
          AND restaurant_id = reservations.restaurant_id
          AND is_active = true
      )
    )
  );

-- 4.5 Actualizar política de restaurant_info
DROP POLICY IF EXISTS "Users can view restaurants they have access to" ON restaurant_info;
CREATE POLICY "Users can view restaurants they have access to" ON restaurant_info
  FOR SELECT
  USING (
    -- Owner/Admin del tenant puede ver todos sus restaurantes
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
    OR
    -- O tiene permiso específico sobre este restaurante
    id IN (
      SELECT restaurant_id FROM user_restaurants
      WHERE auth_user_id = auth.uid()
        AND is_active = true
    )
  );

-- ============================================================================
-- PASO 5: Trigger para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_restaurants_updated_at ON user_restaurants;
CREATE TRIGGER update_user_restaurants_updated_at
  BEFORE UPDATE ON user_restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 6: Vistas útiles
-- ============================================================================

-- 6.1 Vista de usuarios con sus restaurantes asignados
CREATE OR REPLACE VIEW v_user_restaurant_access AS
SELECT
  u.id AS user_id,
  u.email,
  tu.tenant_id,
  t.name AS tenant_name,
  tu.role AS tenant_role,
  ur.restaurant_id,
  ri.name AS restaurant_name,
  ri.slug AS restaurant_slug,
  ur.role AS restaurant_role,
  ur.is_active
FROM auth.users u
INNER JOIN tenant_users tu ON tu.auth_user_id = u.id
INNER JOIN tenants t ON t.id = tu.tenant_id
LEFT JOIN user_restaurants ur ON ur.auth_user_id = u.id AND ur.tenant_id = tu.tenant_id
LEFT JOIN restaurant_info ri ON ri.id = ur.restaurant_id
WHERE tu.is_active = true;

COMMENT ON VIEW v_user_restaurant_access IS 'Vista completa de permisos de usuarios: tenant + restaurantes';

-- 6.2 Vista de restaurantes con conteo de usuarios asignados
CREATE OR REPLACE VIEW v_restaurant_users_summary AS
SELECT
  ri.id AS restaurant_id,
  ri.tenant_id,
  ri.name AS restaurant_name,
  ri.slug,
  COUNT(DISTINCT ur.auth_user_id) AS assigned_users,
  COUNT(DISTINCT ur.auth_user_id) FILTER (WHERE ur.role = 'manager') AS managers,
  COUNT(DISTINCT ur.auth_user_id) FILTER (WHERE ur.role = 'staff') AS staff_members,
  COUNT(DISTINCT ur.auth_user_id) FILTER (WHERE ur.role = 'viewer') AS viewers
FROM restaurant_info ri
LEFT JOIN user_restaurants ur ON ur.restaurant_id = ri.id AND ur.is_active = true
GROUP BY ri.id, ri.tenant_id, ri.name, ri.slug;

COMMENT ON VIEW v_restaurant_users_summary IS 'Resumen de usuarios asignados por restaurante';

-- ============================================================================
-- PASO 7: Datos de ejemplo (comentado - descomentar si se necesita)
-- ============================================================================

/*
-- Ejemplo: Asignar un manager a un restaurante específico
INSERT INTO user_restaurants (auth_user_id, tenant_id, restaurant_id, role)
VALUES (
  'user-uuid',
  'tenant-uuid',
  'restaurant-uuid',
  'manager'
);

-- Ejemplo: Asignar staff a múltiples restaurantes
INSERT INTO user_restaurants (auth_user_id, tenant_id, restaurant_id, role)
VALUES
  ('staff-user-uuid', 'tenant-uuid', 'restaurant-1-uuid', 'staff'),
  ('staff-user-uuid', 'tenant-uuid', 'restaurant-2-uuid', 'staff');
*/

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  -- Verificar que la tabla se creó
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_restaurants'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    RAISE NOTICE '✅ Tabla user_restaurants creada exitosamente';
  ELSE
    RAISE WARNING '❌ ERROR: Tabla user_restaurants no se creó';
  END IF;

  -- Verificar funciones
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_accessible_restaurants') THEN
    RAISE NOTICE '✅ Función get_user_accessible_restaurants creada';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_restaurant_access') THEN
    RAISE NOTICE '✅ Función user_has_restaurant_access creada';
  END IF;

  RAISE NOTICE '✅ Migración 002 completada exitosamente';
  RAISE NOTICE 'Sistema de permisos a nivel de restaurante implementado';
  RAISE NOTICE 'Roles disponibles: manager, staff, viewer';
  RAISE NOTICE 'Owners/Admins del tenant siguen teniendo acceso total';
END $$;

COMMIT;

-- ============================================================================
-- NOTAS POST-MIGRACIÓN
-- ============================================================================

-- 1. JERARQUÍA DE PERMISOS:
--    tenant_users.role = 'owner'/'admin' → Acceso a TODOS los restaurantes
--    user_restaurants.role = 'manager' → Gestión completa de restaurante(s) asignado(s)
--    user_restaurants.role = 'staff' → Operaciones en restaurante(s) asignado(s)
--    user_restaurants.role = 'viewer' → Solo lectura de restaurante(s) asignado(s)

-- 2. ASIGNAR RESTAURANTES A USUARIOS:
--    INSERT INTO user_restaurants (auth_user_id, tenant_id, restaurant_id, role)
--    VALUES ('user-id', 'tenant-id', 'restaurant-id', 'manager');

-- 3. VERIFICAR ACCESO DE UN USUARIO:
--    SELECT * FROM get_user_accessible_restaurants('user-id', 'tenant-id');

-- 4. ACTUALIZAR CÓDIGO DEL PORTAL:
--    - getCurrentTenant() debe usar get_user_accessible_restaurants()
--    - getReservations() debe filtrar por restaurant_ids accesibles
--    - createReservation() debe verificar permiso sobre restaurant_id

-- Para ver resultados:
-- SELECT * FROM v_user_restaurant_access;
-- SELECT * FROM v_restaurant_users_summary;
