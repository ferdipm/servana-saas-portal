import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAccessibleRestaurants } from "@/lib/getCurrentTenant";

type AccessibleRestaurant = {
  id: string;
  name: string;
  slug: string | null;
};

export type TenantAndRestaurantsResult = {
  tenantId: string;
  role: string;
  accessibleRestaurants: AccessibleRestaurant[];
  currentRestaurantId: string;
  canSwitch: boolean;
};

export async function getTenantAndRestaurants(
  requestedRestaurantId?: string
): Promise<TenantAndRestaurantsResult> {
  const supabase = await supabaseServer();

  // 1) Usuario actual
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No se ha podido obtener el usuario autenticado");
  }

  // 2) Tenant + rol del usuario
  const { data: tenantUser, error: tenantUserError } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (tenantUserError || !tenantUser) {
    console.error("getTenantAndRestaurants: tenantUserError", tenantUserError);
    throw new Error("Usuario sin tenant asociado");
  }

  const tenantId = tenantUser.tenant_id as string;
  const role = tenantUser.role as string;

  // 3) Restaurantes accesibles (helper común)
  const rawAccessible = await getUserAccessibleRestaurants();

  if (!rawAccessible || rawAccessible.length === 0) {
    throw new Error("El usuario no tiene ningún restaurante asignado");
  }

  const accessibleRestaurantIds = rawAccessible.map(
    (r: any) => r.restaurant_id
  );

  const { data: restaurantRows, error: restaurantError } = await supabase
    .from("restaurant_info")
    .select("id, name, slug")
    .eq("tenant_id", tenantId)
    .in("id", accessibleRestaurantIds);

  if (restaurantError || !restaurantRows) {
    console.error(
      "getTenantAndRestaurants: error cargando restaurant_info",
      restaurantError
    );
    throw new Error("No se han podido obtener los restaurantes accesibles");
  }

  const accessibleRestaurants: AccessibleRestaurant[] = (restaurantRows as any[])
    .map((r) => ({
      id: r.id as string,
      name: (r.name as string) ?? "Restaurante",
      slug: (r.slug as string | null) ?? null,
    }))
    // orden determinista por nombre
    .sort((a, b) => a.name.localeCompare(b.name));

  if (accessibleRestaurants.length === 0) {
    throw new Error("El usuario no tiene ningún restaurante asignado");
  }

  // 4) Determinar restaurante actual respetando el de la URL
  let currentRestaurantId: string;

  const normalizedRequested =
    requestedRestaurantId && typeof requestedRestaurantId === "string"
      ? requestedRestaurantId
      : undefined;

  // Si viene restaurantId en la URL, verificar que el usuario tiene acceso
  if (normalizedRequested) {
    const canAccessRequested = accessibleRestaurants.some(
      (r) => r.id === normalizedRequested
    );
    if (canAccessRequested) {
      currentRestaurantId = normalizedRequested;
    } else {
      // Si pide un restaurante al que no tiene acceso, usar el primero
      console.warn(
        `[getTenantAndRestaurants] Usuario pidió restaurante ${normalizedRequested} pero no tiene acceso. Usando el primero.`
      );
      currentRestaurantId = accessibleRestaurants[0].id;
    }
  } else {
    // Si no viene nada, usamos el primero accesible
    currentRestaurantId = accessibleRestaurants[0].id;
  }
  
  // 5) ¿Puede cambiar entre varios?
  const canSwitch =
    accessibleRestaurants.length > 1 &&
    (role === "owner" || role === "group_manager" || role === "admin");

  // DEBUG opcional mientras probamos (se ve en consola del server)
  console.log("getTenantAndRestaurants DEBUG", {
    requestedRestaurantId: normalizedRequested,
    tenantId,
    role,
    accessibleRestaurantIds,
    chosenCurrent: currentRestaurantId,
    restaurants: accessibleRestaurants.map((r) => r.id),
  });

  return {
    tenantId,
    role,
    accessibleRestaurants,
    currentRestaurantId,
    canSwitch,
  };
}