"use client";

import { useRouter } from "next/navigation";
import { ReservationsView } from "../reservations-view";

type Props = {
  tenantId: string;
  restaurantId: string;
  defaultTz: string;
};

export function PendingPageContent({ tenantId, restaurantId, defaultTz }: Props) {
  const router = useRouter();

  const handleReservationChange = () => {
    // Forzar refresh del Server Component para actualizar el badge de pendientes
    router.refresh();
  };

  return (
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
        tenantId={tenantId}
        restaurantId={restaurantId}
        defaultTz={defaultTz}
        initialStatus="pending"
        onReservationChange={handleReservationChange}
      />
    </div>
  );
}
