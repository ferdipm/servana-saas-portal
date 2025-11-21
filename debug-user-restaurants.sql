-- Query de debug para verificar acceso a restaurantes de un usuario
-- Reemplaza 'USER_ID' con el auth_user_id del usuario

-- 1. Ver datos del usuario en tenant_users
SELECT
  'tenant_users' as tabla,
  auth_user_id,
  tenant_id,
  role,
  is_active
FROM tenant_users
WHERE auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';

-- 2. Ver restaurantes asignados en user_restaurants
SELECT
  'user_restaurants' as tabla,
  ur.auth_user_id,
  ur.restaurant_id,
  ur.tenant_id,
  ur.role,
  ur.is_active,
  ri.name as restaurant_name
FROM user_restaurants ur
LEFT JOIN restaurant_info ri ON ri.id = ur.restaurant_id
WHERE ur.auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';

-- 3. Probar la función RPC directamente
SELECT * FROM get_user_accessible_restaurants(
  '33686168-ef68-484e-8514-a477c376ad77'::uuid,
  'be9c5e54-21cb-4d83-9cac-d0f8669350cb'::uuid
);

-- 4. Ver todos los restaurantes del tenant
SELECT
  'restaurant_info' as tabla,
  id as restaurant_id,
  name,
  tenant_id
FROM restaurant_info
WHERE tenant_id = 'be9c5e54-21cb-4d83-9cac-d0f8669350cb';
