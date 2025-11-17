import { supabaseServer } from "./supabaseServer";

export async function getCurrentTenantId() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No hay usuario autenticado");
  }

  const { data: tenantUser, error: tuError } = await supabase
    .from("tenant_users")
    .select("tenant_id, role, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (tuError || !tenantUser) {
    throw new Error("No se ha encontrado tenant activo para este usuario");
  }

  return {
    tenantId: tenantUser.tenant_id as string,
    userId: user.id,
    role: tenantUser.role as string,
  };
}

/**
 * Obtiene los restaurantes a los que el usuario tiene acceso
 * - Owners/Admins: Todos los restaurantes del tenant
 * - Managers/Staff: Solo restaurantes asignados en user_restaurants
 */
export async function getUserAccessibleRestaurants() {
  const supabase = await supabaseServer();
  const { userId, tenantId } = await getCurrentTenantId();

  const { data, error } = await supabase.rpc("get_user_accessible_restaurants", {
    p_user_id: userId,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("Error getting accessible restaurants:", error);
    throw new Error("No se pudieron obtener los restaurantes accesibles");
  }

  return (data || []) as Array<{
    restaurant_id: string;
    user_role: string;
  }>;
}

/**
 * Verifica si el usuario tiene acceso a un restaurante específico
 */
export async function userHasRestaurantAccess(restaurantId: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { userId, tenantId } = await getCurrentTenantId();

  const { data, error } = await supabase.rpc("user_has_restaurant_access", {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_restaurant_id: restaurantId,
  });

  if (error) {
    console.error("Error checking restaurant access:", error);
    return false;
  }

  return data === true;
}
