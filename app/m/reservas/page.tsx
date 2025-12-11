export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";
import { MobileReservationsList } from "../reservations-list";

export default async function MobileReservasPage() {
  // Leer restaurantId de la cookie para respetar la selección del usuario
  const cookieStore = await cookies();
  const requestedRestaurantId = cookieStore.get("selectedRestaurantId")?.value;

  const { tenantId, currentRestaurantId } = await getTenantAndRestaurants(requestedRestaurantId);
  const defaultTz = "Europe/Zurich";

  return (
    <MobileReservationsList
      tenantId={tenantId}
      restaurantId={currentRestaurantId}
      defaultTz={defaultTz}
      mode="today"
    />
  );
}
