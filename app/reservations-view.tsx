"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  getReservations,
  Reservation,
  updateReservationStatus,
  updateReservationDetails,
  createReservation,
  getRestaurantShiftsForDate,
  Shift,
} from "./actions";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

type Props = {
  tenantId: string;
  restaurantId?: string;
  defaultTz?: string;
  initialStatus?: string; // undefined en "/", "pending" en /pending
  onReservationChange?: () => void; // Callback para notificar cambios
};

// Helper para traducir el origen de la reserva al español
function translateSource(source: string | null | undefined): string {
  if (!source) return "—";
  const translations: Record<string, string> = {
    phone: "Teléfono",
    whatsapp: "WhatsApp",
    manual: "Manual",
    web: "Web",
    bot: "Bot IA",
    walkin: "Sin reserva",
    "walk-in": "Sin reserva",
    email: "Email",
    app: "Aplicación",
  };
  return translations[source.toLowerCase()] || source;
}

export function ReservationsView({
  tenantId,
  restaurantId,
  defaultTz = "Europe/Zurich",
  initialStatus,
  onReservationChange,
}: Props) {
  const isPendingMode = initialStatus === "pending";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(initialStatus ?? "all");

  // Por defecto: HOY 00:00 → MAÑANA 00:00
  const [from, setFrom] = useState<string>(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base.toISOString();
  });

  const [to, setTo] = useState<string>(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + 1);
    return base.toISOString();
  });

  const [rows, setRows] = useState<Reservation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState(false);

  // offset para los botones rápidos (Hoy, +1 día)
  const [dayOffset, setDayOffset] = useState(0);

  // Turnos del restaurante para la fecha seleccionada
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Ref para el cursor actual (para paginación sin causar re-renders del callback)
  const nextCursorRef = useRef<string | null>(null);
  nextCursorRef.current = nextCursor;

  // Request ID para cancelar peticiones obsoletas
  const requestIdRef = useRef(0);
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Estado debounced de q para la búsqueda
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce del query de búsqueda
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [q]);

  // Función para cargar datos - estable para usar en Realtime
  const loadInitial = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      // Si hay búsqueda activa, buscar desde hoy hacia el futuro (sin límite de fecha final)
      let searchFrom = from;
      let searchTo = to;
      if (debouncedQ.trim()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        searchFrom = today.toISOString();
        // Fecha muy lejana para incluir todas las reservas futuras
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 2);
        searchTo = farFuture.toISOString();
      }

      const res = await getReservations({
        tenantId,
        restaurantId,
        q: debouncedQ,
        status,
        from: searchFrom,
        to: searchTo,
        limit: 50,
        cursorCreatedAt: null,
      });

      // Solo actualizar si esta es la petición más reciente
      if (currentRequestId === requestIdRef.current) {
        setRows(res.data);
        setNextCursor(res.nextCursor);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [tenantId, restaurantId, debouncedQ, status, from, to]);

  // Ref para evitar cargar más mientras se está cargando
  const loadingMoreRef = useRef(false);

  // Función para cargar más (paginación)
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !nextCursorRef.current) return;
    loadingMoreRef.current = true;
    setLoading(true);
    try {
      // Si hay búsqueda activa, buscar desde hoy hacia el futuro
      let searchFrom = from;
      let searchTo = to;
      if (debouncedQ.trim()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        searchFrom = today.toISOString();
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 2);
        searchTo = farFuture.toISOString();
      }

      const res = await getReservations({
        tenantId,
        restaurantId,
        q: debouncedQ,
        status,
        from: searchFrom,
        to: searchTo,
        limit: 50,
        cursorCreatedAt: nextCursorRef.current,
      });
      setRows((prev) => [...prev, ...res.data]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, [tenantId, restaurantId, debouncedQ, status, from, to]);

  // Cargar datos iniciales cuando cambian los filtros
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Cargar turnos cuando cambia la fecha (solo si no es modo pending)
  useEffect(() => {
    if (isPendingMode || !restaurantId) return;

    const loadShifts = async () => {
      const selectedDate = new Date(from);
      const shiftsData = await getRestaurantShiftsForDate(restaurantId, selectedDate);
      setShifts(shiftsData);
    };

    loadShifts();
  }, [from, restaurantId, isPendingMode]);

  // Suscripción en tiempo real para nuevas reservas
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Construir el filtro para el canal
    const channelName = restaurantId
      ? `reservations:tenant=${tenantId}:restaurant=${restaurantId}`
      : `reservations:tenant=${tenantId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "reservations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log("[Realtime] Reservation change:", payload.eventType);
          // Recargar la lista cuando hay cambios
          loadInitial();
          // Notificar al padre para que actualice los contadores (SummaryCards)
          onReservationChange?.();
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    // Cleanup: eliminar la suscripción al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, restaurantId, loadInitial, onReservationChange]);

  const visibleRows = useMemo(() => {
    if (isPendingMode) return rows;

    if (status === "all") {
      // Vista general: ocultamos pending + cancelled por defecto
      return rows.filter(
        (r) => r.status !== "pending" && r.status !== "cancelled"
      );
    }

    // Filtros concretos: respetamos el status, pero nunca mostramos pending aquí
    return rows.filter((r) => r.status !== "pending");
  }, [rows, isPendingMode, status]);

  // Helper para convertir "HH:MM" a minutos desde medianoche
  const timeToMinutes = useCallback((time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  // Determinar el turno de una reserva basándose en su hora
  const getShiftForReservation = useCallback(
    (dateStr: string, tz: string): Shift | null => {
      if (shifts.length === 0) return null;

      const dtUtc = new Date(dateStr);
      const timeStr = dtUtc.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      });
      const reservationMinutes = timeToMinutes(timeStr);

      // Buscar en qué turno cae la reserva
      for (const shift of shifts) {
        const shiftStart = timeToMinutes(shift.startTime);
        const shiftEnd = timeToMinutes(shift.endTime);

        // Manejar turnos que cruzan medianoche
        if (shiftEnd < shiftStart) {
          if (reservationMinutes >= shiftStart || reservationMinutes < shiftEnd) {
            return shift;
          }
        } else {
          if (reservationMinutes >= shiftStart && reservationMinutes < shiftEnd) {
            return shift;
          }
        }
      }

      // Si no está dentro de ningún turno, asignar al más cercano
      let closestShift = shifts[0];
      let minDistance = Infinity;
      for (const shift of shifts) {
        const shiftStart = timeToMinutes(shift.startTime);
        const distance = Math.abs(reservationMinutes - shiftStart);
        if (distance < minDistance) {
          minDistance = distance;
          closestShift = shift;
        }
      }
      return closestShift;
    },
    [shifts, timeToMinutes]
  );

  // Obtener colores del turno
  const getShiftColors = useCallback((shiftName: string): string => {
    const name = shiftName.toLowerCase();
    if (name.includes("desayuno") || name.includes("breakfast")) {
      return "bg-amber-50/90 dark:bg-amber-900/30 border-amber-200/60 dark:border-amber-800/50 text-amber-900 dark:text-amber-100";
    }
    if (name.includes("comida") || name.includes("lunch") || name.includes("almuerzo")) {
      return "bg-emerald-50/90 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100";
    }
    if (name.includes("cena") || name.includes("dinner")) {
      return "bg-indigo-50/90 dark:bg-indigo-900/30 border-indigo-200/60 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-100";
    }
    return "bg-zinc-50/90 dark:bg-zinc-800/50 border-zinc-200/60 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100";
  }, []);

  // Contar reservas por turno
  const getShiftReservationCount = useCallback(
    (shiftName: string): number => {
      return visibleRows.filter((r) => {
        const shift = getShiftForReservation(r.datetime_utc, r.tz || defaultTz);
        return shift?.name === shiftName;
      }).length;
    },
    [visibleRows, getShiftForReservation, defaultTz]
  );

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    // Altura estimada: 72px en móvil (card compacta), 92px en desktop
    estimateSize: () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 72 : 92),
    overscan: 8,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    function onScroll() {
      if (!el) return;
      const nearBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 300;

      if (nearBottom && nextCursor && !loading) loadMore();
    }

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [nextCursor, loading, loadMore]);

  function setDayRange(offset: number) {
    setDayOffset(offset);

    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + offset);

    const fromDate = new Date(base);
    const toDate = new Date(base);
    toDate.setDate(toDate.getDate() + 1);

    setFrom(fromDate.toISOString());
    setTo(toDate.toISOString());
  }

  const statusOptions = isPendingMode
    ? [
        { value: "pending", label: "Pendiente" },
        { value: "confirmed", label: "Confirmada" },
        { value: "seated", label: "Sentado" },
        { value: "cancelled", label: "Cancelada" },
        { value: "no_show", label: "No show" },
        { value: "finished", label: "Finalizada" },
      ]
    : [
        { value: "all", label: "Todos" },
        { value: "confirmed", label: "Confirmada" },
        { value: "seated", label: "Sentado" },
        { value: "cancelled", label: "Cancelada" },
        { value: "no_show", label: "No show" },
        { value: "finished", label: "Finalizada" },
      ];

  return (
    <>
      <div className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
        {/* Toolbar */}
        <div className="px-3 md:px-4 py-3 bg-white/70 dark:bg-[#121317]/85 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            {/* Buscador (+ estado solo en vista general) */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-full md:w-80">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o localizador"
                  className="h-9 w-full rounded-lg border border-zinc-300/60 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-900/60 px-3 pr-8 text-sm focus:ring-2 focus:ring-indigo-400/30 outline-none"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {!isPendingMode && (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-300/60 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-900/60 px-2 text-sm outline-none"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Rango + botones rápidos + nueva reserva */}
            <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap md:justify-end">
              <span className="hidden md:inline text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Ver reservas de:
              </span>

              {/* HOY */}
              <button
                onClick={() => setDayRange(0)}
                className={`
                  text-sm px-3 py-1.5 rounded-lg font-medium whitespace-nowrap
                  ${
                    dayOffset === 0
                      ? "bg-indigo-600 text-white"
                      : "bg-white/70 dark:bg-zinc-900/50 border border-zinc-400/40 dark:border-zinc-700/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70"
                  }
                `}
              >
                Hoy
              </button>

              {/* +1 DÍA (acumulativo) */}
              <button
                onClick={() => setDayRange(dayOffset < 0 ? 1 : dayOffset + 1)}
                className={`
                  text-sm px-3 py-1.5 rounded-lg font-medium whitespace-nowrap
                  ${
                    dayOffset > 0
                      ? "bg-indigo-600 text-white"
                      : "bg-white/70 dark:bg-zinc-900/50 border border-zinc-400/40 dark:border-zinc-700/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70"
                  }
                `}
              >
                +1 día
              </button>

              {/* DatePicker Desde - solo desktop */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="
                      hidden md:flex
                      h-9 px-3 rounded-lg border border-zinc-300/60 dark:border-zinc-700/60
                      bg-white/80 dark:bg-zinc-900/60 text-sm items-center gap-2 whitespace-nowrap
                    "
                  >
                    Desde{" "}
                    {from ? new Date(from).toLocaleDateString("es-ES") : ""}
                  </button>
                </PopoverTrigger>

                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={from ? new Date(from) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        // Setear al inicio del día (00:00:00.000)
                        const startOfDay = new Date(d);
                        startOfDay.setHours(0, 0, 0, 0);
                        setFrom(startOfDay.toISOString());

                        // También actualizar "to" al final del mismo día si está antes de "from"
                        const endOfDay = new Date(d);
                        endOfDay.setHours(23, 59, 59, 999);
                        const currentTo = to ? new Date(to) : null;
                        if (!currentTo || currentTo < startOfDay) {
                          setTo(endOfDay.toISOString());
                        }

                        // Resetear dayOffset porque estamos usando el calendario manualmente
                        setDayOffset(-1); // -1 indica selección manual
                      } else {
                        setFrom("");
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>

              {/* DatePicker Hasta - solo desktop */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="
                      hidden md:flex
                      h-9 px-3 rounded-lg border border-zinc-300/60 dark:border-zinc-700/60
                      bg-white/80 dark:bg-zinc-900/60 text-sm items-center gap-2 whitespace-nowrap
                    "
                  >
                    Hasta{" "}
                    {to ? new Date(to).toLocaleDateString("es-ES") : ""}
                  </button>
                </PopoverTrigger>

                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={to ? new Date(to) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        // Setear al final del día (23:59:59.999)
                        const endOfDay = new Date(d);
                        endOfDay.setHours(23, 59, 59, 999);
                        setTo(endOfDay.toISOString());

                        // Resetear dayOffset porque estamos usando el calendario manualmente
                        setDayOffset(-1); // -1 indica selección manual
                      } else {
                        setTo("");
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>

              {/* Botón NUEVA RESERVA MANUAL */}
              {!isPendingMode && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="
                    h-9 px-3 md:px-4 rounded-xl text-sm font-medium
                    border border-emerald-400/60
                    bg-emerald-500/15 hover:bg-emerald-500/25
                    text-emerald-700 dark:text-emerald-50
                    shadow-md backdrop-blur-sm
                    transition-colors
                    inline-flex items-center gap-2
                    whitespace-nowrap
                  "
                >
                  <span className="hidden md:inline">Reserva manual</span>
                  <span className="md:hidden">+ Nueva</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header columnas - solo visible en desktop */}
        <div className="hidden md:block px-3 md:px-4 pt-3 mb-5">
          <div className="bg-white dark:bg-[#1c1e24] ring-1 ring-zinc-300/50 dark:ring-white/10 rounded-md shadow-sm overflow-hidden">
            <div
              className="
                grid grid-cols-[1fr_1.2fr_.9fr_1fr_1fr_auto]
                items-center
                gap-4
                px-6 py-5
              "
            >
              {[
                "Fecha",
                "Nombre",
                "Comensales",
                "Teléfono",
                "Localizador",
                "Estado",
              ].map((label, i) => (
                <div
                  key={label}
                  className="text-left font-medium text-[15px] text-zinc-600 dark:text-zinc-400 relative"
                  style={{
                    left: ["-12px", "-17px", "-24px", "-21px", "-30px", "-20px"][i],
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div
          ref={parentRef}
          className="h-[65vh] overflow-auto bg-white/60 dark:bg-[#101114]"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const r = visibleRows[vRow.index];
              if (!r) return null;

              // Determinar si mostrar header de turno
              const currentShift = getShiftForReservation(r.datetime_utc, r.tz || defaultTz);
              let showShiftHeader = false;
              if (shifts.length > 0 && currentShift && !debouncedQ.trim()) {
                if (vRow.index === 0) {
                  showShiftHeader = true;
                } else {
                  const prevRow = visibleRows[vRow.index - 1];
                  if (prevRow) {
                    const prevShift = getShiftForReservation(prevRow.datetime_utc, prevRow.tz || defaultTz);
                    showShiftHeader = currentShift.name !== prevShift?.name;
                  }
                }
              }

              return (
                <div
                  key={r.id}
                  className="absolute left-0 right-0"
                  style={{ transform: `translateY(${vRow.start}px)` }}
                >
                  {showShiftHeader && currentShift && (
                    <div className={`px-3 md:px-6 py-2.5 border-b ${getShiftColors(currentShift.name)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <span className="text-base">{currentShift.emoji}</span>
                          {currentShift.name}
                          <span className="text-xs font-normal opacity-75">
                            {currentShift.startTime} - {currentShift.endTime}
                          </span>
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                          {getShiftReservationCount(currentShift.name)} reservas
                        </span>
                      </div>
                    </div>
                  )}
                  <ReservationRow
                    r={r}
                    defaultTz={defaultTz}
                    onClick={() => setSelected(r)}
                  />
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="p-6 text-center text-sm text-zinc-500">
              Cargando…
            </div>
          )}

          {!loading && visibleRows.length === 0 && (
            <div className="p-10 text-center text-zinc-500">
              <div className="text-lg font-medium mb-1">No hay reservas</div>
              <div className="text-sm">Prueba otros filtros.</div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ReservationDrawer
          reservation={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            loadInitial();
            onReservationChange?.(); // Notificar cambio
          }}
          isPendingMode={isPendingMode}
        />
      )}

      {creating && (
        <NewReservationDrawer
          tenantId={tenantId}
          restaurantId={restaurantId}
          defaultTz={defaultTz}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            // refrescamos lista (se verá en el rango actual)
            loadInitial();
            onReservationChange?.(); // Notificar cambio
          }}
        />
      )}
    </>
  );
}

/* -------------------------- STATUS CHIP -------------------------- */

/* -------------------------- CONFIRMATION CHIP -------------------------- */

function ConfirmationChip({ status }: { status?: string | null }) {
  if (!status || status === 'not_required') return null;

  const map: Record<string, { icon: string; label: string; txt: string; bg: string; brd: string }> = {
    pending: {
      icon: '⏳',
      label: 'Esperando respuesta',
      txt: 'text-amber-900 dark:text-amber-200',
      bg: 'bg-amber-50/80 dark:bg-amber-900/20',
      brd: 'border-amber-200/60 dark:border-amber-800/50',
    },
    confirmed: {
      icon: '✅',
      label: 'Cliente confirmó',
      txt: 'text-emerald-900 dark:text-emerald-200',
      bg: 'bg-emerald-50/80 dark:bg-emerald-900/20',
      brd: 'border-emerald-200/60 dark:border-emerald-800/50',
    },
    declined: {
      icon: '❌',
      label: 'Cliente canceló',
      txt: 'text-rose-900 dark:text-rose-200',
      bg: 'bg-rose-50/80 dark:bg-rose-900/20',
      brd: 'border-rose-200/60 dark:border-rose-800/50',
    },
    no_response: {
      icon: '🔕',
      label: 'Sin respuesta',
      txt: 'text-zinc-700 dark:text-zinc-300',
      bg: 'bg-zinc-100/80 dark:bg-zinc-800/40',
      brd: 'border-zinc-300/60 dark:border-zinc-700/50',
    },
  };

  const k = map[status];
  if (!k) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${k.bg} ${k.txt} ${k.brd}`}
    >
      <span>{k.icon}</span>
      {k.label}
    </span>
  );
}

/* ---------------------- HOOK SINGLETON TICK ---------------------- */

// Hook singleton para tick global cada 5 min (evita múltiples timers)
let globalTickListeners: Set<() => void> = new Set();
let globalTickInterval: NodeJS.Timeout | null = null;

function useMinuteTick() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    globalTickListeners.add(listener);

    // Iniciar timer solo si es el primer listener
    if (globalTickListeners.size === 1 && !globalTickInterval) {
      globalTickInterval = setInterval(() => {
        globalTickListeners.forEach((l) => l());
      }, 300000); // 5 minutos
    }

    return () => {
      globalTickListeners.delete(listener);
      // Limpiar timer si no quedan listeners
      if (globalTickListeners.size === 0 && globalTickInterval) {
        clearInterval(globalTickInterval);
        globalTickInterval = null;
      }
    };
  }, []);
}

/* -------------------------- STATUS CHIP -------------------------- */

// Helper para calcular si está retrasado (15+ min)
function isLate(datetimeUtc: string | undefined, status: string | undefined): boolean {
  if (!datetimeUtc) return false;
  if (status !== "confirmed" && status !== "reconfirmed") return false;
  const reservationTime = new Date(datetimeUtc);
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  return reservationTime < fifteenMinutesAgo;
}

function StatusChip({ s, datetimeUtc }: { s?: string; datetimeUtc?: string }) {
  // Hook para actualización automática del estado "Retrasado"
  useMinuteTick();

  const map: Record<
    string,
    {
      dot: string;
      label: string;
      txt: string;
      bg: string;
      brd: string;
    }
  > = {
    pending: {
      dot: "bg-amber-400",
      label: "Pendiente",
      txt: "text-amber-900 dark:text-amber-200",
      bg: "bg-amber-50/80 dark:bg-amber-900/20",
      brd: "border-amber-200/60 dark:border-amber-800/50",
    },
    confirmed: {
      dot: "bg-emerald-400",
      label: "Confirmada",
      txt: "text-emerald-900 dark:text-emerald-200",
      bg: "bg-emerald-50/80 dark:bg-emerald-900/20",
      brd: "border-emerald-200/60 dark:border-emerald-800/50",
    },
    reconfirmed: {
      dot: "bg-teal-400",
      label: "Reconfirmada",
      txt: "text-teal-900 dark:text-teal-200",
      bg: "bg-teal-50/80 dark:bg-teal-900/20",
      brd: "border-teal-200/60 dark:border-teal-800/50",
    },
    arrived: {
      dot: "bg-blue-400",
      label: "Llegó",
      txt: "text-blue-900 dark:text-blue-200",
      bg: "bg-blue-50/80 dark:bg-blue-900/20",
      brd: "border-blue-200/60 dark:border-blue-800/50",
    },
    seated: {
      dot: "bg-sky-400",
      label: "Sentado",
      txt: "text-sky-900 dark:text-sky-200",
      bg: "bg-sky-50/80 dark:bg-sky-900/20",
      brd: "border-sky-200/60 dark:border-sky-800/50",
    },
    cancelled: {
      dot: "bg-rose-400",
      label: "Cancelada",
      txt: "text-rose-900 dark:text-rose-200",
      bg: "bg-rose-50/80 dark:bg-rose-900/20",
      brd: "border-rose-200/60 dark:border-rose-800/50",
    },
    no_show: {
      dot: "bg-fuchsia-400",
      label: "No show",
      txt: "text-fuchsia-900 dark:text-fuchsia-200",
      bg: "bg-fuchsia-50/80 dark:bg-fuchsia-900/20",
      brd: "border-fuchsia-200/60 dark:border-fuchsia-800/50",
    },
    finished: {
      dot: "bg-zinc-400",
      label: "Finalizada",
      txt: "text-zinc-900 dark:text-zinc-200",
      bg: "bg-zinc-50/80 dark:bg-zinc-900/20",
      brd: "border-zinc-200/60 dark:border-zinc-700/50",
    },
  };

  const k = s ? map[s] : null;
  if (!k) return <span className="text-zinc-500">—</span>;

  // Si está retrasado, mostrar chip especial de "Retrasado"
  const late = isLate(datetimeUtc, s);
  if (late) {
    return (
      <span
        className="inline-flex items-center justify-center gap-2 h-6 px-3 rounded-full text-xs border min-w-[120px] bg-orange-50/80 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700 ring-2 ring-orange-400/50 animate-pulse"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        Retrasado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center gap-2 h-6 px-3 rounded-full text-xs border min-w-[120px] ${k.bg} ${k.txt} ${k.brd}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${k.dot}`} />
      {k.label}
    </span>
  );
}

/* -------------------------- LATE CHIP (para móvil) -------------------------- */

function LateChip({ datetimeUtc, status }: { datetimeUtc: string; status?: string }) {
  // Usar hook singleton para actualización cada minuto
  useMinuteTick();

  // Solo mostrar para confirmed o reconfirmed
  if (status !== "confirmed" && status !== "reconfirmed") return null;

  const reservationTime = new Date(datetimeUtc);
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  // Si la hora de reserva ya pasó hace más de 15 minutos
  if (reservationTime < fifteenMinutesAgo) {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-full text-xs border bg-orange-50/80 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200 border-orange-200/60 dark:border-orange-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        Retrasado
      </span>
    );
  }

  return null;
}

/* ---------------------------- ROW ----------------------------- */

function ReservationRow({
  r,
  defaultTz,
  onClick,
}: {
  r: Reservation;
  defaultTz: string;
  onClick?: () => void;
}) {
  const tz = r.tz || defaultTz;
  const dtUtc = new Date(r.datetime_utc);

  const day = dtUtc
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: tz,
    })
    .replace(".", "");

  // Formato corto de día para móvil (ej: "7 dic")
  const dayShort = dtUtc
    .toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      timeZone: tz,
    })
    .replace(".", "");

  const time = dtUtc.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });

  return (
    <div
      onClick={onClick}
      className="
        px-3 md:px-6 py-3 md:py-3.5
        text-sm transition-colors
        hover:bg-black/[.025] dark:hover:bg-white/[.035]
        border-b border-zinc-200/40 dark:border-zinc-800/40
        cursor-pointer
      "
    >
      {/* Vista móvil: card compacta */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2">
          {/* Izquierda: hora + fecha corta */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {time}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {dayShort}
            </div>
          </div>
          {/* Derecha: estado y badges */}
          <div className="flex items-center gap-1.5">
            <StatusChip s={r.status} />
            <LateChip datetimeUtc={r.datetime_utc} status={r.status} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          {/* Nombre */}
          <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {r.name}
          </div>
          {/* Comensales */}
          <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
            {r.party_size ?? "—"} pax
          </div>
        </div>
      </div>

      {/* Vista desktop: grid de columnas */}
      <div className="hidden md:grid grid-cols-[1fr_1.2fr_.9fr_1fr_1fr_auto] gap-4 items-center">
        <div className="truncate">
          <div className="font-medium">{day}</div>
          <div className="text-[12px] text-zinc-500">{time}</div>
        </div>

        <div className="truncate">{r.name}</div>
        <div className="truncate">{r.party_size ?? "—"}</div>
        <div className="truncate">{r.phone ?? "—"}</div>

        <div className="truncate font-mono text-[13px] text-zinc-400">
          #{r.locator ?? r.id.slice(0, 8)}
        </div>

        <div className="truncate">
          <StatusChip s={r.status} datetimeUtc={r.datetime_utc} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------- DRAWER EXISTENTE --------------------------- */

function ReservationDrawer({
  reservation,
  onClose,
  onUpdated,
  isPendingMode = false,
}: {
  reservation: Reservation;
  onClose: () => void;
  onUpdated: () => void;
  isPendingMode?: boolean;
}) {
  const tz = reservation.tz || "Europe/Zurich";
  const dtUtc = new Date(reservation.datetime_utc);

  const [editDate, setEditDate] = useState<Date | undefined>(dtUtc);
  const [editTime, setEditTime] = useState<string>(
    dtUtc.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    })
  );

  const [name, setName] = useState<string>(reservation.name ?? "");
  const [phone, setPhone] = useState<string>(reservation.phone ?? "");
  const [partySize, setPartySize] = useState<string>(
    reservation.party_size?.toString() ?? ""
  );
  const [notes, setNotes] = useState<string>(reservation.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);

  async function handleSave() {
    // limpiamos error previo
    setError(null);

    // Validar nombre obligatorio
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    // Validar que hay fecha y hora
    if (!editDate || !editTime) {
      setError("Por favor, rellena fecha y hora.");
      return;
    }

    // Validar comensales (mínimo 1 si se informa)
    if (!partySize) {
      setError("El número de comensales debe ser al menos 1.");
      return;
    }
    const numericPartySize = Number(partySize);
    if (Number.isNaN(numericPartySize) || numericPartySize < 1) {
      setError("El número de comensales debe ser al menos 1.");
      return;
    }

    // Construir fecha/hora
    // Nota: En edición de reservas existentes permitimos fechas pasadas
    // (ej: marcar llegada de un retrasado). Solo validamos en nuevas reservas.
    const [hourStr, minuteStr] = editTime.split(":");
    const dt = new Date(editDate);
    dt.setHours(Number(hourStr), Number(minuteStr), 0, 0);

    setSaving(true);
    try {
      await updateReservationDetails({
        reservationId: reservation.id,
        name: name.trim(),
        phone: phone || null,
        party_size: numericPartySize,
        notes: notes || null,
        datetime_utc: dt.toISOString(),
      });
      onUpdated();
    } catch (err) {
      console.error("Error saving reservation:", err);
      setError("Error al guardar los cambios. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    console.log(`[StatusChange] Changing reservation ${reservation.id} from "${reservation.status}" to "${newStatus}"`);
    setSaving(true);
    setError(null);
    try {
      const result = await updateReservationStatus({
        reservationId: reservation.id,
        status: newStatus,
      });
      console.log(`[StatusChange] Success:`, result);
      // Cerrar drawer y refrescar lista
      onUpdated();
    } catch (err: unknown) {
      console.error("[StatusChange] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(`Error al cambiar el estado: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendReminder() {
    setSendingReminder(true);
    setError(null);
    setReminderSuccess(false);
    try {
      const response = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: reservation.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar recordatorio');
        return;
      }

      setReminderSuccess(true);
      // Refrescar después de 1.5s para mostrar el estado actualizado
      setTimeout(() => onUpdated(), 1500);
    } catch (err) {
      setError('Error de conexión al enviar recordatorio');
    } finally {
      setSendingReminder(false);
    }
  }

  // Determinar si se puede enviar recordatorio
  // Usamos chat_id o phone (si tiene formato de teléfono válido)
  const hasWhatsAppNumber = reservation.chat_id || reservation.phone;
  const canSendReminder =
    reservation.status === 'confirmed' &&
    hasWhatsAppNumber &&
    new Date(reservation.datetime_utc) > new Date() &&
    !sendingReminder;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel lateral */}
      <aside
        className="
          fixed right-0 top-0 bottom-0 z-50
          w-full max-w-lg
          bg-white dark:bg-[#0b0b0d] text-zinc-900 dark:text-zinc-100
          border-l border-zinc-200 dark:border-zinc-800
          shadow-2xl
          flex flex-col
        "
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-zinc-500">Reserva</div>
            <div className="text-base font-semibold">
              {reservation.name || "Sin nombre"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm"
          >
            Cerrar
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {error && (
            <div className="mb-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {/* Nombre editable */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
              placeholder="Nombre del cliente"
            />
          </div>
          {/* Fecha y hora (editables) */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Fecha */}
            <div>
              <div className="text-xs text-zinc-500 mb-1">Fecha</div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="
                      h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700/60
                      bg-white dark:bg-zinc-900/60 text-sm flex items-center gap-2 w-full
                      justify-between
                    "
                  >
                    <span>
                      {editDate
                        ? editDate.toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Selecciona fecha"}
                    </span>
                    <span className="text-[11px] text-zinc-500">Cambiar</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={editDate}
                    onSelect={(d) => setEditDate(d ?? undefined)}
                    // En modo edición permitimos fechas pasadas (ej: reservas retrasadas)
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Hora */}
            <div>
              <div className="text-xs text-zinc-500 mb-1">Hora</div>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Comensales / Teléfono */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Comensales</div>
              <input
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm"
                inputMode="numeric"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Teléfono</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* Localizador / Origen */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Localizador</div>
              <div className="font-mono text-[13px] text-zinc-600 dark:text-zinc-300">
                #{reservation.locator ?? reservation.id.slice(0, 8)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Origen</div>
              <div className="text-sm">{translateSource(reservation.source)}</div>
            </div>
          </div>

          {/* Estado actual */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Estado actual</div>
            <StatusChip s={reservation.status} />
          </div>

          {/* Estado confirmación cliente */}
          {reservation.confirmation_status && reservation.confirmation_status !== 'not_required' && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Confirmación del cliente</div>
              <ConfirmationChip status={reservation.confirmation_status} />
              {reservation.confirmation_sent_at && (
                <div className="text-[11px] text-zinc-500 mt-1">
                  Recordatorio enviado: {new Date(reservation.confirmation_sent_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
              {reservation.confirmation_replied_at && (
                <div className="text-[11px] text-zinc-500">
                  Respuesta: {new Date(reservation.confirmation_replied_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          )}

          {/* Enviar recordatorio manual */}
          {canSendReminder && (
            <div className="pt-2">
              <div className="text-xs text-zinc-500 mb-2">Enviar recordatorio por WhatsApp</div>
              {reminderSuccess ? (
                <div className="text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded-md px-3 py-2">
                  ✅ Recordatorio enviado correctamente
                </div>
              ) : (
                <button
                  disabled={sendingReminder}
                  onClick={handleSendReminder}
                  className="
                    px-4 py-2 rounded-lg text-sm font-medium
                    border border-sky-400/60
                    bg-sky-500/10 text-sky-700 dark:text-sky-100
                    hover:bg-sky-500/20
                    disabled:opacity-60
                    inline-flex items-center gap-2
                  "
                >
                  {sendingReminder ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span>📲</span>
                      Enviar recordatorio
                    </>
                  )}
                </button>
              )}
              <div className="text-[11px] text-zinc-500 mt-1.5">
                El cliente recibirá un mensaje con opción de confirmar o cancelar.
              </div>
            </div>
          )}

          {/* Mensaje si no hay WhatsApp */}
          {reservation.status === 'confirmed' && !hasWhatsAppNumber && (
            <div className="pt-2">
              <div className="text-xs text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 rounded-md px-3 py-2">
                📵 Esta reserva no tiene número de teléfono asociado.
              </div>
            </div>
          )}

          {/* Notas internas */}
          <div className="pt-2">
            <div className="text-xs text-zinc-500 mb-1">Notas internas</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm resize-none"
              placeholder="Notas para el equipo (no se muestran al cliente)…"
            />
          </div>

          {/* Botón guardar centrado */}
          <div className="pt-4 flex justify-center">
            <button
              disabled={saving}
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                border border-indigo-400/60
                bg-indigo-500/10 text-indigo-700 dark:text-indigo-100
                hover:bg-indigo-500/20
                disabled:opacity-60
              "
              onClick={handleSave}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>

          {/* Cambio rápido de estado */}
          <div className="pt-8">
            <div className="text-xs text-zinc-500 mb-4 uppercase tracking-wide">
              Cambio rápido de estado
            </div>

            {isPendingMode ? (
              // Modo /pending: solo Confirmar y Cancelar
              <div className="flex gap-2 flex-nowrap">
                <button
                  disabled={saving}
                  className="
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-emerald-500/40
                    bg-emerald-500/10 text-emerald-700 dark:text-emerald-200
                    hover:bg-emerald-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("confirmed")}
                >
                  Confirmar
                </button>

                <button
                  disabled={saving}
                  className="
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-rose-400/50
                    bg-rose-500/10 text-rose-700 dark:text-rose-200
                    hover:bg-rose-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("cancelled")}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              // Vista general: todos los estados rápidos
              <div className="flex flex-wrap gap-2">
                {/* Confirmada */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-emerald-500/40
                    bg-emerald-500/10 text-emerald-700 dark:text-emerald-200
                    hover:bg-emerald-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("confirmed")}
                >
                  Confirmada
                </button>

                {/* Llegada */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-indigo-500/40
                    bg-indigo-500/10 text-indigo-700 dark:text-indigo-200
                    hover:bg-indigo-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("arrived")}
                >
                  Llegada
                </button>

                {/* Sentada */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-sky-500/40
                    bg-sky-500/10 text-sky-700 dark:text-sky-200
                    hover:bg-sky-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("seated")}
                >
                  Sentada
                </button>

                {/* Finalizada */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-zinc-500/40
                    bg-zinc-500/10 text-zinc-700 dark:text-zinc-100
                    hover:bg-zinc-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("finished")}
                >
                  Finalizada
                </button>

                {/* Cancelada */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-rose-400/50
                    bg-rose-500/10 text-rose-700 dark:text-rose-200
                    hover:bg-rose-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("cancelled")}
                >
                  Cancelada
                </button>

                {/* No-show */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-amber-400/50
                    bg-amber-500/10 text-amber-700 dark:text-amber-200
                    hover:bg-amber-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("no_show")}
                >
                  No-show
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ----------------------- DRAWER NUEVA RESERVA ----------------------- */

/* ----------------------- DRAWER NUEVA RESERVA ----------------------- */

function NewReservationDrawer({
  tenantId,
  restaurantId,
  defaultTz,
  onClose,
  onCreated,
}: {
  tenantId: string;
  restaurantId?: string;
  defaultTz: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("20:00");
  const [notes, setNotes] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    // limpiamos error previo
    setError(null);

    if (!name.trim() || !partySize || !date || !time) {
      setError("Por favor, rellena nombre, comensales, fecha y hora.");
      return;
    }

    const numericPartySize = Number(partySize);
    if (Number.isNaN(numericPartySize) || numericPartySize < 1) {
      setError("El número de comensales debe ser al menos 1.");
      return;
    }

    const [hourStr, minuteStr] = time.split(":");
    const dt = new Date(date);
    dt.setHours(Number(hourStr), Number(minuteStr), 0, 0);

    const now = new Date();
    if (dt.getTime() < now.getTime()) {
      setError("La fecha y hora deben ser en el futuro.");
      return;
    }

    setSaving(true);
    try {
      await createReservation({
        tenantId,
        restaurantId: restaurantId || undefined,
        name: name.trim(),
        phone: phone || null,
        party_size: numericPartySize,
        datetime_utc: dt.toISOString(),
        notes: notes || null,
        source: "phone",
        tz: defaultTz,
        status: "confirmed", // reservas manuales → confirmadas por defecto
        sendWhatsAppConfirmation: sendWhatsApp && !!phone, // solo si está activado Y hay teléfono
      });

      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      {/* Panel lateral */}
      <aside
        className="
          fixed right-0 top-0 bottom-0 z-50
          w-full max-w-lg
          bg-white dark:bg-[#0b0b0d] text-zinc-900 dark:text-zinc-100
          border-l border-zinc-200 dark:border-zinc-800
          shadow-2xl
          flex flex-col
        "
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-zinc-500">
              Nueva reserva manual
            </div>
            <div className="text-base font-semibold">Crear reserva</div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm"
          >
            Cerrar
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4 text-sm">
          <p className="text-xs text-zinc-500">
            Usa este formulario para reservas creadas por teléfono o en sala.
          </p>
          {error && (
            <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Nombre *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
              placeholder="Nombre del cliente"
            />
          </div>

          {/* Teléfono / Comensales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Teléfono</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
                placeholder="+34…"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Comensales *</div>
              <input
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Checkbox enviar confirmación WhatsApp */}
          {phone && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
              <input
                type="checkbox"
                id="sendWhatsApp"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="sendWhatsApp" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Enviar confirmación por WhatsApp
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  El cliente recibirá un mensaje con los detalles de la reserva y un QR de check-in.
                </div>
              </label>
            </div>
          )}

          {/* Fecha + hora */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fecha con popover, igual estilo que en la lista */}
            <div>
              <div className="text-xs text-zinc-500 mb-1">Fecha *</div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="
                      h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700/60
                      bg-white dark:bg-zinc-900/60 text-sm flex items-center gap-2 w-full
                      justify-between
                    "
                  >
                    <span>
                      {date
                        ? date.toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Selecciona fecha"}
                    </span>
                    <span className="text-[11px] text-zinc-500">Cambiar</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={date}
                    onSelect={(d) => setDate(d ?? undefined)}
                    disabled={(dateValue) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const d = new Date(dateValue);
                      d.setHours(0, 0, 0, 0);
                      return d < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Hora */}
            <div>
              <div className="text-xs text-zinc-500 mb-1">Hora *</div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
              />
              <div className="text-[11px] text-zinc-500 mt-1">
                Se usará la zona horaria del restaurante ({defaultTz}).
              </div>
            </div>
          </div>

          {/* Notas internas */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Notas internas</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm resize-none"
              placeholder="Alergias, peticiones especiales…"
            />
          </div>

          {/* Info de estado inicial */}
          <div className="text-xs text-zinc-500 pt-2">
            Estado inicial:{" "}
            <span className="font-medium text-emerald-600 dark:text-emerald-300">Confirmada</span>{" "}
            (reservas creadas manualmente).
          </div>

          {/* Botón crear reserva centrado bajo el texto de estado inicial */}
          <div className="pt-5 pb-2 flex justify-center">
            <button
              disabled={saving}
              onClick={handleCreate}
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                border border-emerald-400/60
                bg-emerald-500/15 text-emerald-700 dark:text-emerald-50
                hover:bg-emerald-500/25
                disabled:opacity-60
              "
            >
              {saving ? "Creando…" : "Crear reserva"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}