"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getReservations, Reservation, updateReservationStatus, createReservation } from "../actions";
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);

  // Calcular rango de fechas basado en selectedDate
  const getDateRange = useCallback((date: Date) => {
    const fromDate = new Date(date);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 1);

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }, []);

  // Navegación de días
  const goToPreviousDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + "T00:00:00");
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const openDatePicker = () => {
    dateInputRef.current?.showPicker();
  };

  const formatSelectedDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (selectedDate.getTime() === today.getTime()) return "Hoy";
    if (selectedDate.getTime() === tomorrow.getTime()) return "Mañana";

    return selectedDate.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const { from, to } = getDateRange(selectedDate);
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
  }, [tenantId, restaurantId, mode, selectedDate, getDateRange]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Botón Nueva Reserva + Selector de día (solo en modo today) */}
      {mode === "today" && (
        <div className="sticky top-0 z-30 bg-zinc-50 dark:bg-[#0a0a0c] px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          {/* Botón Nueva Reserva */}
          <button
            onClick={() => setShowNewReservation(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Reserva
          </button>

          {/* Selector de día con flechas */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Día anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Fecha clickable que abre calendario */}
            <button
              onClick={openDatePicker}
              className="flex-1 max-w-[200px] py-2.5 px-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              {formatSelectedDate()}
            </button>

            {/* Input de fecha oculto para el calendario nativo */}
            <input
              ref={dateInputRef}
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={handleDateChange}
              className="sr-only"
              aria-hidden="true"
            />

            <button
              onClick={goToNextDay}
              className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Día siguiente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
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
                : `No hay reservas para ${formatSelectedDate().toLowerCase()}`}
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

      {/* Modal de nueva reserva */}
      {showNewReservation && (
        <NewReservationModal
          tenantId={tenantId}
          restaurantId={restaurantId}
          defaultTz={defaultTz}
          defaultDate={selectedDate}
          onClose={() => setShowNewReservation(false)}
          onSuccess={() => {
            setShowNewReservation(false);
            loadData();
          }}
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

function NewReservationModal({
  tenantId,
  restaurantId,
  defaultTz,
  defaultDate,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  restaurantId: string;
  defaultTz: string;
  defaultDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(defaultDate.toISOString().split("T")[0]);
  const [time, setTime] = useState("13:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setSaving(true);

    try {
      const datetimeLocal = new Date(`${date}T${time}:00`);
      const datetime_utc = datetimeLocal.toISOString();

      await createReservation({
        tenantId,
        restaurantId,
        name: name.trim(),
        phone: phone.trim() || null,
        party_size: partySize,
        datetime_utc,
        notes: notes.trim() || null,
        source: "manual",
        tz: defaultTz,
        status: "confirmed",
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la reserva");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal desde abajo */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[90vh] overflow-auto safe-area-bottom animate-slide-up">
        {/* Handle */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Nueva Reserva
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nombre del cliente"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+34 600 000 000"
              />
            </div>

            {/* Personas */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Personas
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  className="w-12 h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xl"
                >
                  -
                </button>
                <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 w-12 text-center">
                  {partySize}
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize(partySize + 1)}
                  className="w-12 h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xl"
                >
                  +
                </button>
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 space-y-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                "Crear Reserva"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
