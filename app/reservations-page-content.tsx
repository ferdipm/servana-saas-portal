"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SummaryCards } from "./summary-cards";
import { ReservationsView } from "./reservations-view";

type Props = {
  tenantId: string;
  restaurantId: string;
  defaultTz: string;
  restaurantName?: string;
};

export function ReservationsPageContent({ tenantId, restaurantId, defaultTz, restaurantName }: Props) {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleReservationChange = () => {
    // Incrementar el trigger para que SummaryCards se recargue
    setRefreshTrigger((prev) => prev + 1);
    // Forzar refresh del Server Component para actualizar el badge de pendientes
    // Envolver en try-catch para evitar que errores de Server Components rompan el flujo
    try {
      router.refresh();
    } catch (e) {
      console.error("[handleReservationChange] router.refresh error:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de la página */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Reservas
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Vista general de todas las reservas confirmadas
        </p>
      </header>

      <SummaryCards
        tenantId={tenantId}
        restaurantId={restaurantId}
        refreshTrigger={refreshTrigger}
      />

      <ReservationsView
        tenantId={tenantId}
        restaurantId={restaurantId}
        defaultTz={defaultTz}
        restaurantName={restaurantName}
        onReservationChange={handleReservationChange}
      />
    </div>
  );
}
