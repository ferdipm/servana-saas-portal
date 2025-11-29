export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";
import DashboardShell from "../dashboard-shell";
import { PendingPageContent } from "./pending-page-content";
import { getPendingTodayCount } from "../actions";

type PendingPageProps = {
  searchParams?: Promise<{
    restaurantId?: string;
  }>;
};

export default async function PendingPage({ searchParams }: PendingPageProps) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?redirectTo=/pending`);
  }

  const params = await searchParams;
  const requestedRestaurantId = params?.restaurantId;

  const {
    tenantId,
    accessibleRestaurants,
    currentRestaurantId,
    canSwitch,
  } = await getTenantAndRestaurants(requestedRestaurantId);

  // Obtener nombre y logo del restaurante actual
  const { data: restaurantInfo } = await supabase
    .from("restaurant_info")
    .select("name, logo_url")
    .eq("id", currentRestaurantId)
    .single();

  // Obtener conteo de pendientes para hoy
  const pendingCount = await getPendingTodayCount({
    tenantId,
    restaurantId: currentRestaurantId,
  });

  const defaultTz = "Europe/Zurich";

  return (
    <DashboardShell
      userEmail={user.email}
      restaurants={accessibleRestaurants}
      currentRestaurantId={currentRestaurantId}
      canSwitch={canSwitch}
      restaurantName={restaurantInfo?.name}
      restaurantLogoUrl={restaurantInfo?.logo_url}
      pendingCount={pendingCount}
    >
      <PendingPageContent
        key={currentRestaurantId}
        tenantId={tenantId}
        restaurantId={currentRestaurantId}
        defaultTz={defaultTz}
      />
    </DashboardShell>
  );
}