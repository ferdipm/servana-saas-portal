"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getReservations, Reservation, updateReservationStatus } from "../actions";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

type Props = {
  tenantId: string;
  restaurantId: string;
  defaultTz: string;
  mode: "today" | "pending";
};

export function MobileReservationsList({ tenantId, restaurantId, defaultTz, mode }: Props) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const loadingRef = useRef(false);

  // Calcular rango de fechas según el offset
  const getDateRange = useCallback((offset: number) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + offset);

    const fromDate = new Date(base);
    const toDate = new Date(base);
    toDate.setDate(toDate.getDate() + 1);

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }, []);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const { from, to } = getDateRange(dayOffset);
      const res = await getReservations({
        tenantId,
        restaurantId,
        status: mode === "pending" ? "pending" : "all",
        from: mode === "pending" ? undefined : from,
        to: mode === "pending" ? undefined : to,
        limit: 100,
        cursorCreatedAt: null,
      });

      // Filtrar según el modo
      let filtered = res.data;
      if (mode === "today") {
        // Vista hoy: solo confirmadas y seated (no pending, no cancelled)
        filtered = res.data.filter(r => r.status === "confirmed" || r.status === "seated");
      }

      setRows(filtered);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [tenantId, restaurantId, mode, dayOffset, getDateRange]);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Suscripción Realtime
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channelName = `mobile:reservations:${tenantId}:${restaurantId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, restaurantId, loadData]);

  // Cambio rápido de estado
  async function handleQuickAction(reservation: Reservation, newStatus: string) {
    try {
      await updateReservationStatus({
        reservationId: reservation.id,
        status: newStatus,
      });
      loadData();
      setSelectedReservation(null);
    } catch (e) {
      console.error("Error updating status:", e);
    }
  }

  const formatTime = (dateStr: string, tz: string) => {
    return new Date(dateStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  };

  const formatDay = (dateStr: string, tz: string) => {
    return new Date(dateStr)
      .toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        timeZone: tz,
      })
      .replace(".", "");
  };

  const getDayLabel = (offset: number) => {
    if (offset === 0) return "Hoy";
    if (offset === 1) return "Mañana";
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Selector de día (solo en modo today) */}
      {mode === "today" && (
        <div className="sticky top-0 z-30 bg-zinc-50 dark:bg-[#0a0a0c] px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[0, 1, 2, 3, 4].map((offset) => (
              <button
                key={offset}
                onClick={() => setDayOffset(offset)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${dayOffset === offset
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700"
                  }
                `}
              >
                {getDayLabel(offset)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Encabezado de pendientes */}
      {mode === "pending" && (
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Reservas pendientes
          </h2>
          <p className="text-sm text-zinc-500">
            {rows.length} {rows.length === 1 ? "reserva requiere" : "reservas requieren"} confirmación
          </p>
        </div>
      )}

      {/* Lista de reservas */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="text-4xl mb-3">
              {mode === "pending" ? "✅" : "📅"}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
              {mode === "pending"
                ? "No hay reservas pendientes"
                : `No hay reservas para ${getDayLabel(dayOffset).toLowerCase()}`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelectedReservation(r)}
                  className="w-full text-left px-4 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:bg-zinc-200 dark:active:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Hora y fecha */}
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatTime(r.datetime_utc, r.tz || defaultTz)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatDay(r.datetime_utc, r.tz || defaultTz)}
                        </div>
                      </div>

                      {/* Nombre y comensales */}
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {r.name}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {r.party_size} {r.party_size === 1 ? "persona" : "personas"}
                        </div>
                      </div>
                    </div>

                    {/* Estado */}
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          defaultTz={defaultTz}
          isPending={mode === "pending"}
          onClose={() => setSelectedReservation(null)}
          onQuickAction={handleQuickAction}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      label: "Pendiente",
    },
    confirmed: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      label: "Confirmada",
    },
    seated: {
      bg: "bg-sky-100 dark:bg-sky-900/30",
      text: "text-sky-700 dark:text-sky-300",
      label: "Sentado",
    },
    cancelled: {
      bg: "bg-rose-100 dark:bg-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      label: "Cancelada",
    },
    no_show: {
      bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      label: "No show",
    },
    finished: {
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-700 dark:text-zinc-300",
      label: "Finalizada",
    },
  };

  const c = status ? config[status] : null;
  if (!c) return null;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function ReservationModal({
  reservation,
  defaultTz,
  isPending,
  onClose,
  onQuickAction,
}: {
  reservation: Reservation;
  defaultTz: string;
  isPending: boolean;
  onClose: () => void;
  onQuickAction: (r: Reservation, status: string) => void;
}) {
  const tz = reservation.tz || defaultTz;
  const dt = new Date(reservation.datetime_utc);

  const dateStr = dt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  });

  const timeStr = dt.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal desde abajo */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[85vh] overflow-auto safe-area-bottom animate-slide-up">
        {/* Handle */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {reservation.name}
              </h2>
              <p className="text-sm text-zinc-500">
                #{reservation.locator || reservation.id.slice(0, 8)}
              </p>
            </div>
            <StatusBadge status={reservation.status} />
          </div>

          {/* Detalles */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="capitalize">{dateStr}</span>
            </div>

            <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{timeStr}</span>
            </div>

            <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{reservation.party_size} {reservation.party_size === 1 ? "persona" : "personas"}</span>
            </div>

            {reservation.phone && (
              <a
                href={`tel:${reservation.phone}`}
                className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{reservation.phone}</span>
              </a>
            )}

            {reservation.notes && (
              <div className="mt-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Notas</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
              Acciones rápidas
            </p>

            {isPending ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onQuickAction(reservation, "confirmed")}
                  className="py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => onQuickAction(reservation, "cancelled")}
                  className="py-3 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
                >
                  Rechazar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {reservation.status === "confirmed" && (
                  <button
                    onClick={() => onQuickAction(reservation, "seated")}
                    className="py-3 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                  >
                    Sentar
                  </button>
                )}
                {reservation.status === "seated" && (
                  <button
                    onClick={() => onQuickAction(reservation, "finished")}
                    className="py-3 rounded-xl text-sm font-semibold bg-zinc-500 hover:bg-zinc-600 text-white transition-colors"
                  >
                    Finalizar
                  </button>
                )}
                {(reservation.status === "confirmed" || reservation.status === "seated") && (
                  <button
                    onClick={() => onQuickAction(reservation, "no_show")}
                    className="py-3 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    No show
                  </button>
                )}
                <button
                  onClick={() => onQuickAction(reservation, "cancelled")}
                  className="py-3 rounded-xl text-sm font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
