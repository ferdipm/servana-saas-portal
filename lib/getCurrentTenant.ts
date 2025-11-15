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
  };
}
