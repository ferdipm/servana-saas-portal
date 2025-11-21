export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";
import DashboardShell from "../dashboard-shell";
import { ReservationsView } from "../reservations-view";

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

  const defaultTz = "Europe/Zurich";

  return (
    <DashboardShell
      userEmail={user.email}
      restaurants={accessibleRestaurants}
      currentRestaurantId={currentRestaurantId}
      canSwitch={canSwitch}
      restaurantName={restaurantInfo?.name}
      restaurantLogoUrl={restaurantInfo?.logo_url}
    >
      <div className="space-y-6">
        {/* Header de la página */}
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Reservas pendientes
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Solicitudes que requieren revisión y confirmación manual
          </p>
        </header>

        <ReservationsView
          key={currentRestaurantId}
          tenantId={tenantId}
          restaurantId={currentRestaurantId}
          defaultTz={defaultTz}
          initialStatus="pending"
        />
      </div>
    </DashboardShell>
  );
}