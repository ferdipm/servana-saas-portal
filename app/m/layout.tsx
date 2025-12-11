export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";
import { MobileShell } from "./mobile-shell";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function MobileLayout({ children }: LayoutProps) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?redirectTo=/m`);
  }

  // Leer restaurantId de la cookie
  const cookieStore = await cookies();
  const requestedRestaurantId = cookieStore.get("selectedRestaurantId")?.value;

  const {
    tenantId,
    currentRestaurantId,
    accessibleRestaurants,
    canSwitch,
  } = await getTenantAndRestaurants(requestedRestaurantId);

  // Obtener nombre del restaurante
  const { data: restaurantInfo } = await supabase
    .from("restaurant_info")
    .select("name")
    .eq("id", currentRestaurantId)
    .single();

  return (
    <MobileShell
      tenantId={tenantId}
      restaurantId={currentRestaurantId}
      restaurantName={restaurantInfo?.name || "Restaurante"}
      restaurants={accessibleRestaurants}
      canSwitch={canSwitch}
    >
      {children}
    </MobileShell>
  );
}
