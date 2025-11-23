export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";
import DashboardShell from "../dashboard-shell";
import { SettingsContent } from "./SettingsContent";

type SettingsPageProps = {
  searchParams?: Promise<{
    restaurantId?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const requestedRestaurantId = params.restaurantId;

  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?redirectTo=/settings`);
  }

  const {
    tenantId,
    accessibleRestaurants,
    currentRestaurantId,
    canSwitch,
    role,
  } = await getTenantAndRestaurants(requestedRestaurantId);

  const currentRestaurant = accessibleRestaurants.find(
    (r: any) => r.id === currentRestaurantId
  );

  // --- Cargar datos básicos del restaurante (incluyendo menú y horarios) ---
  const { data: infoRow, error: infoError } = await supabase
    .from("restaurant_info")
    .select(
      `
      id,
      name,
      address,
      phone,
      website,
      opening_hours,
      special_days,
      faq,
      menu_items,
      set_menus,
      wine_menu,
      logo_url
    `
    )
    .eq("id", currentRestaurantId)
    .single();

  if (infoError) {
    console.error("Error cargando restaurant_info en /settings:", infoError);
  }

  const initialInfo = {
    name: infoRow?.name ?? "",
    phone: infoRow?.phone ?? "",
    website: infoRow?.website ?? "",
    address: infoRow?.address ?? "",
    // De momento no tenemos city/country/timezone en la tabla, los dejamos así por ahora
    city: "",
    country: "",
    timezone: "Europe/Madrid", // o "Europe/Zurich", como prefieras por defecto
    logoUrl: infoRow?.logo_url ?? "",
  };

  // En tu esquema real, los datos extendidos viven en restaurant_info
  const initialFaqs = infoRow?.faq ?? [];
  const initialMenu = infoRow?.menu_items ?? {};
  const initialSetMenus = infoRow?.set_menus ?? [];
  const initialWineMenu = infoRow?.wine_menu ?? { categories: [] };
  const initialOpeningHours = infoRow?.opening_hours ?? {};
  const initialSpecialDays = infoRow?.special_days ?? [];

  return (
    <DashboardShell
      userEmail={user.email}
      restaurants={accessibleRestaurants}
      currentRestaurantId={currentRestaurantId}
      canSwitch={canSwitch}
      restaurantName={infoRow?.name}
      restaurantLogoUrl={infoRow?.logo_url}
    >
      <div className="space-y-4">
        <header className="mb-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Ajustes del restaurante
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configura los datos de{" "}
            <span className="font-medium text-zinc-100">
              {currentRestaurant?.name ?? "tu restaurante"}
            </span>
            .
          </p>
        </header>

        <SettingsContent
          key={currentRestaurantId}
          tenantId={tenantId}
          restaurantId={currentRestaurantId}
          role={role}
          initialInfo={initialInfo}
          initialFaqs={initialFaqs}
          initialMenu={initialMenu}
          initialSetMenus={initialSetMenus}
          initialWineMenu={initialWineMenu}
          initialOpeningHours={initialOpeningHours}
          initialSpecialDays={initialSpecialDays}
        />
      </div>
    </DashboardShell>
  );
}