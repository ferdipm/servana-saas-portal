export const dynamic = "force-dynamic";

import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";
import { MobileReservationsList } from "../../reservations-list";

export default async function MobilePendingPage() {
  const { tenantId, currentRestaurantId } = await getTenantAndRestaurants();
  const defaultTz = "Europe/Zurich";

  return (
    <MobileReservationsList
      tenantId={tenantId}
      restaurantId={currentRestaurantId}
      defaultTz={defaultTz}
      mode="pending"
    />
  );
}
