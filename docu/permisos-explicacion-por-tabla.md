📋 Sistema de Roles - Resumen Completo
Estructura de 2 Niveles
Tu sistema tiene roles en 2 lugares:
Rol a nivel Tenant (tabla tenant_users) - Rol general del usuario en la organización
Rol a nivel Restaurante (tabla user_restaurants) - Rol específico por restaurante
Roles a Nivel Tenant (tenant_users)
1. owner - Dueño/Propietario
Permisos:
✅ Acceso total a TODOS los restaurantes del tenant
✅ Puede cambiar entre restaurantes
✅ Puede modificar configuración (horarios, logo, datos generales)
✅ Puede ver y editar reservas de todos los restaurantes
✅ Puede gestionar usuarios y asignar permisos
Caso de uso: El dueño de la cadena de restaurantes
2. admin - Administrador
Permisos:
✅ Acceso total a TODOS los restaurantes del tenant
✅ Puede cambiar entre restaurantes
✅ Puede modificar configuración
✅ Puede ver y editar reservas de todos los restaurantes
✅ Puede gestionar usuarios (en teoría, similar a owner)
Caso de uso: Director de operaciones, gerente general de la cadena Diferencia con owner: Técnicamente pueden tener los mismos permisos, pero el owner es el rol "supremo" por convención.
3. group_manager - Gerente de Grupo
Permisos:
✅ Acceso a TODOS los restaurantes del tenant
✅ Puede cambiar entre restaurantes
✅ Puede modificar configuración
✅ Puede ver y editar reservas
Caso de uso: Supervisor de varios restaurantes, pero no es dueño ni admin completo
4. manager - Gerente
Permisos:
⚠️ Solo acceso a restaurantes asignados en user_restaurants
❌ NO puede cambiar entre restaurantes (solo ve dropdown si tiene acceso a múltiples)
✅ Puede modificar configuración de SUS restaurantes
✅ Puede ver y editar reservas de SUS restaurantes
Caso de uso: Gerente de un restaurante específico o de algunos restaurantes
5. staff - Personal
Permisos:
⚠️ Solo acceso a restaurantes asignados
❌ NO puede cambiar entre restaurantes
❌ NO puede modificar configuración (read-only en settings)
✅ Puede ver reservas
⚠️ Puede editar reservas (según permisos específicos)
Caso de uso: Recepcionista, hostess, personal de sala
6. waiter - Camarero
Permisos:
⚠️ Solo acceso a restaurantes asignados
❌ NO puede cambiar entre restaurantes
❌ NO puede modificar configuración (read-only)
✅ Puede ver reservas
⚠️ Permisos limitados (puede marcar como sentado, servido, etc.)
Caso de uso: Camareros que necesitan ver la lista de reservas
7. viewer / read_only - Solo Lectura
Permisos:
⚠️ Solo acceso a restaurantes asignados
❌ NO puede cambiar entre restaurantes
❌ NO puede modificar NADA
✅ Solo puede VER datos
Caso de uso: Analistas, auditores, invitados
Regla de Acceso a Restaurantes
SI role IN ('owner', 'admin', 'group_manager')
  → Acceso automático a TODOS los restaurantes del tenant
  
SI role IN ('manager', 'staff', 'waiter', 'viewer', 'read_only')
  → Solo acceso a restaurantes asignados en user_restaurants
Regla para Cambiar de Restaurante (Dropdown)
canSwitch = 
  accessibleRestaurants.length > 1 
  AND 
  role IN ('owner', 'admin', 'group_manager')
Esto significa:
Un manager con acceso a 2 restaurantes NO verá dropdown (solo verá el primero)
Un group_manager con acceso a 2 restaurantes SÍ verá dropdown
Solución para tu Usuario
Usuario actual:
Rol: manager en tenant_users
Restaurantes: 2 (El Enfriador Castellana, No me llames Dolores)
Para que vea el dropdown:
UPDATE tenant_users
SET role = 'group_manager'
WHERE auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';
Jerarquía de Roles (de mayor a menor poder)
1. owner          → Dueño total
2. admin          → Administrador completo
3. group_manager  → Gerente de grupo (múltiples restaurantes)
4. manager        → Gerente (restaurantes específicos)
5. staff          → Personal operativo
6. waiter         → Camarero
7. viewer         → Solo lectura
Recomendaciones
Para tu caso específico:
Si este usuario gestiona ambos restaurantes → group_manager
Si solo debe gestionar uno ocasionalmente → manager (pero solo verá uno a la vez)
Query para actualizar:
UPDATE tenant_users
SET role = 'group_manager'
WHERE auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';
¿Cambio el rol a group_manager para este usuario?
O sea hay que poner group_manager en tenant_users y con eso ya puede cambiar pero solo le apareceran en el dropdown los que tenga asignados en restaurant_users, correcto?
¡Exacto! Pero con un matiz importante:
Cómo Funciona group_manager
Cuando pones role = 'group_manager' en tenant_users:
❌ NO funciona así (lo que preguntaste):
"Solo le aparecerán en el dropdown los que tenga asignados en user_restaurants"
✅ SÍ funciona así (realidad):
Le aparecerán TODOS los restaurantes del tenant, sin importar user_restaurants
Por Qué
Mira el código de la función RPC en migrations/002_restaurant_permissions.sql:58-71:
IF EXISTS (
  SELECT 1 FROM tenant_users
  WHERE auth_user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND is_active = true
    AND role IN ('owner', 'admin')  -- ❌ Aquí NO incluye group_manager
) THEN
  -- Devolver TODOS los restaurantes del tenant
  RETURN QUERY
  SELECT ri.id AS restaurant_id, 'owner'::TEXT AS user_role
  FROM restaurant_info ri
  WHERE ri.tenant_id = p_tenant_id;
Pero espera, hay un problema: La función RPC solo da acceso total a owner y admin, NO a group_manager. Entonces group_manager:
Sí puede cambiar de restaurante (por la línea 116 de getTenantAndRestaurants.ts)
Pero solo ve los restaurantes asignados en user_restaurants (porque la RPC no lo incluye en el IF)
Solución Correcta para tu Caso
Tienes 2 opciones:
Opción 1: Usar admin en lugar de group_manager
UPDATE tenant_users
SET role = 'admin'
WHERE auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';
Resultado:
✅ Puede cambiar de restaurante
✅ Ve TODOS los restaurantes del tenant automáticamente
✅ No necesita registros en user_restaurants
Opción 2: Usar group_manager + asegurar user_restaurants
UPDATE tenant_users
SET role = 'group_manager'
WHERE auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';
Resultado:
✅ Puede cambiar de restaurante
✅ Solo ve los restaurantes en user_restaurants (que ya tienes configurados)
✅ Más control granular
Mi Recomendación
Como ya tienes los 2 restaurantes configurados en user_restaurants, usa group_manager:
UPDATE tenant_users
SET role = 'group_manager'
WHERE auth_user_id = '33686168-ef68-484e-8514-a477c376ad77';
Ventajas:
Ya tienes todo configurado
Funciona inmediatamente
Si más adelante añades un 3er restaurante y NO quieres que este usuario lo vea, no hace falta hacer nada (solo no lo añades a user_restaurants)