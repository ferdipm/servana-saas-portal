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
    walkin: "Presencial",
    "walk-in": "Presencial",
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

  // Sistema de rango de fechas estilo móvil
  const [dateRange, setDateRange] = useState<"day" | "week" | "month" | "custom">("day");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Derivar from/to del estado selectedDate y endDate
  const from = useMemo(() => selectedDate.toISOString(), [selectedDate]);
  const to = useMemo(() => {
    if (endDate) {
      const toDate = new Date(endDate);
      toDate.setDate(toDate.getDate() + 1);
      toDate.setHours(0, 0, 0, 0);
      return toDate.toISOString();
    }
    const toDate = new Date(selectedDate);
    toDate.setDate(toDate.getDate() + 1);
    return toDate.toISOString();
  }, [selectedDate, endDate]);

  const [rows, setRows] = useState<Reservation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState(false);

  // Estado para el date picker popover (calendario desde-hasta)
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<1 | 2>(1); // 1 = seleccionando desde, 2 = seleccionando hasta
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);

  // Helper: obtener inicio de semana (lunes)
  const getWeekStart = useCallback((date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  }, []);

  // Helper: obtener fin de semana (domingo)
  const getWeekEnd = useCallback((date: Date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }, [getWeekStart]);

  // Helper: obtener inicio de mes
  const getMonthStart = useCallback((date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  }, []);

  // Helper: obtener fin de mes
  const getMonthEnd = useCallback((date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d;
  }, []);

  // Navegación: avanzar según el modo
  const goToNext = useCallback(() => {
    if (dateRange === "day") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
      });
    } else if (dateRange === "week") {
      // Avanzar a la siguiente semana completa (lunes a domingo)
      setSelectedDate(prev => {
        const nextWeekStart = getWeekStart(prev);
        nextWeekStart.setDate(nextWeekStart.getDate() + 7);
        return nextWeekStart;
      });
      setEndDate(prev => {
        if (!prev) return null;
        const nextWeekEnd = getWeekEnd(prev);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
        return nextWeekEnd;
      });
    } else if (dateRange === "month") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setDate(1);
        return newDate;
      });
      setEndDate(prev => {
        if (!prev) return null;
        const newDate = new Date(prev);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + 1);
        return getMonthEnd(newDate);
      });
    }
  }, [dateRange, getMonthEnd, getWeekStart, getWeekEnd]);

  // Navegación: retroceder según el modo
  const goToPrevious = useCallback(() => {
    if (dateRange === "day") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 1);
        return newDate;
      });
    } else if (dateRange === "week") {
      // Retroceder a la semana anterior completa (lunes a domingo)
      setSelectedDate(prev => {
        const prevWeekStart = getWeekStart(prev);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        return prevWeekStart;
      });
      setEndDate(prev => {
        if (!prev) return null;
        const prevWeekEnd = getWeekEnd(prev);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
        return prevWeekEnd;
      });
    } else if (dateRange === "month") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() - 1);
        newDate.setDate(1);
        return newDate;
      });
      setEndDate(prev => {
        if (!prev) return null;
        const newDate = new Date(prev);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() - 1);
        return getMonthEnd(newDate);
      });
    }
  }, [dateRange, getMonthEnd, getWeekStart, getWeekEnd]);

  // Cambiar a vista Hoy
  const setTodayView = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    setEndDate(null);
    setDateRange("day");
  }, []);

  // Cambiar a vista Semana (semana completa lunes a domingo)
  const setWeekView = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);
    setSelectedDate(weekStart);
    setEndDate(weekEnd);
    setDateRange("week");
  }, [getWeekStart, getWeekEnd]);

  // Cambiar a vista Mes
  const setMonthView = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthEnd = getMonthEnd(today);
    setSelectedDate(today);
    setEndDate(monthEnd);
    setDateRange("month");
  }, [getMonthEnd]);

  // Verificar si estamos en el periodo actual
  const isCurrentPeriod = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate.getTime() === today.getTime();
  }, [selectedDate]);

  // Formatear fecha seleccionada
  const formatSelectedDate = useCallback(() => {
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
  }, [selectedDate]);

  // Formato de rango para mostrar
  const formatDateRangeLabel = useCallback(() => {
    if (dateRange === "day") {
      return formatSelectedDate();
    }

    if (endDate) {
      const startDay = selectedDate.getDate();
      const endDay = endDate.getDate();
      const startMonth = selectedDate.toLocaleDateString("es-ES", { month: "short" });
      const endMonth = endDate.toLocaleDateString("es-ES", { month: "short" });

      if (startMonth === endMonth) {
        return `Del ${startDay} al ${endDay} de ${startMonth}`;
      }
      return `Del ${startDay} ${startMonth} al ${endDay} ${endMonth}`;
    }

    return formatSelectedDate();
  }, [dateRange, selectedDate, endDate, formatSelectedDate]);

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

  // Pre-calcular qué filas tienen header de día (para vista multi-día)
  const rowsWithDayHeader = useMemo(() => {
    const isMultiDay = endDate !== null;
    if (!isMultiDay || debouncedQ.trim()) return new Set<number>();

    const headerIndices = new Set<number>();
    for (let i = 0; i < visibleRows.length; i++) {
      const r = visibleRows[i];
      const currentDay = new Date(r.datetime_utc).toDateString();
      if (i === 0) {
        headerIndices.add(i);
      } else {
        const prevRow = visibleRows[i - 1];
        const prevDay = new Date(prevRow.datetime_utc).toDateString();
        if (currentDay !== prevDay) {
          headerIndices.add(i);
        }
      }
    }
    return headerIndices;
  }, [visibleRows, endDate, debouncedQ]);

  // Pre-calcular qué filas tienen header de turno
  const rowsWithShiftHeader = useMemo(() => {
    if (shifts.length === 0 || debouncedQ.trim()) return new Set<number>();

    const headerIndices = new Set<number>();
    for (let i = 0; i < visibleRows.length; i++) {
      const r = visibleRows[i];
      const currentShift = getShiftForReservation(r.datetime_utc, r.tz || defaultTz);
      if (!currentShift) continue;

      if (i === 0) {
        headerIndices.add(i);
      } else {
        const prevRow = visibleRows[i - 1];
        const prevShift = getShiftForReservation(prevRow.datetime_utc, prevRow.tz || defaultTz);
        if (currentShift.name !== prevShift?.name) {
          headerIndices.add(i);
        }
      }
    }
    return headerIndices;
  }, [visibleRows, shifts, debouncedQ, getShiftForReservation, defaultTz]);

  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    // Altura dinámica: base + extra si tiene headers
    estimateSize: (index) => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const baseHeight = isMobile ? 68 : 52; // Reducido para más densidad
      const dayHeaderHeight = rowsWithDayHeader.has(index) ? 40 : 0;
      const shiftHeaderHeight = rowsWithShiftHeader.has(index) ? 44 : 0;
      return baseHeight + dayHeaderHeight + shiftHeaderHeight;
    },
    overscan: 8,
  });

  // Re-medir filas cuando cambien los headers
  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowsWithDayHeader, rowsWithShiftHeader, rowVirtualizer]);

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

            {/* Sistema de navegación de fechas estilo móvil */}
            <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap md:justify-end">
              {/* Grupo de navegación con flechas y presets */}
              <div className="flex items-stretch gap-1 bg-white dark:bg-zinc-800/80 rounded-xl p-1 border border-zinc-200 dark:border-zinc-700">
                {/* Botón retroceder */}
                <button
                  onClick={goToPrevious}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Anterior"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Presets: Hoy, Semana, Mes - Solo activos cuando corresponden */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={setTodayView}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      dateRange === "day" && isCurrentPeriod
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={setWeekView}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      dateRange === "week"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={setMonthView}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      dateRange === "month"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Mes
                  </button>
                </div>

                {/* Botón avanzar */}
                <button
                  onClick={goToNext}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Siguiente"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Icono de calendario para rango personalizado (desde-hasta) */}
              <Popover open={datePickerOpen} onOpenChange={(open) => {
                setDatePickerOpen(open);
                if (!open) {
                  // Resetear estado del picker al cerrar
                  setPickerStep(1);
                  setTempFromDate(null);
                }
              }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl border transition-colors ${
                      dateRange === "custom"
                        ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                    title="Seleccionar rango de fechas"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h8m-4 5h4" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  {/* Indicadores Desde/Hasta estilo móvil */}
                  <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center mb-2">
                      Seleccionar rango de fechas
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className={`flex-1 px-3 py-1.5 rounded-lg border-2 transition-all ${
                        pickerStep === 1
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      }`}>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Desde</div>
                        <div className={`text-sm font-semibold ${
                          pickerStep === 1 ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-900 dark:text-zinc-100"
                        }`}>
                          {tempFromDate
                            ? tempFromDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                            : "—"}
                        </div>
                      </div>

                      <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>

                      <div className={`flex-1 px-3 py-1.5 rounded-lg border-2 transition-all ${
                        pickerStep === 2
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      }`}>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Hasta</div>
                        <div className={`text-sm font-semibold ${
                          pickerStep === 2 ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-500 dark:text-zinc-400"
                        }`}>
                          {pickerStep === 2 ? "Selecciona..." : "—"}
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                      {pickerStep === 1 ? "Toca la fecha de inicio" : "Ahora toca la fecha final"}
                    </p>
                  </div>
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={pickerStep === 1 ? tempFromDate || undefined : undefined}
                    onSelect={(day) => {
                      if (!day) return;
                      if (pickerStep === 1) {
                        setTempFromDate(day);
                        setPickerStep(2);
                      } else {
                        // Paso 2: seleccionar fecha final
                        if (tempFromDate) {
                          // Si clickan una fecha anterior al "desde", intercambiar
                          if (day < tempFromDate) {
                            setSelectedDate(day);
                            setEndDate(tempFromDate);
                          } else {
                            setSelectedDate(tempFromDate);
                            setEndDate(day);
                          }
                          setDateRange("custom");
                          setDatePickerOpen(false);
                          // Resetear estado del picker para la próxima vez
                          setPickerStep(1);
                          setTempFromDate(null);
                        }
                      }
                    }}
                    modifiers={{
                      selected: tempFromDate ? [tempFromDate] : [],
                    }}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: "rgb(79 70 229)",
                        color: "white",
                        borderRadius: "9999px",
                      },
                    }}
                    numberOfMonths={1}
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

          {/* Mostrar rango de fechas actual (si no es "Hoy" o es custom/week/month) */}
          {(!isCurrentPeriod || dateRange !== "day") && (
            <div className="mt-3 mx-2 py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-center">
              <span className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">
                {formatDateRangeLabel()}
              </span>
              <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-400/80">
                ({visibleRows.length} reserva{visibleRows.length !== 1 ? "s" : ""})
              </span>
            </div>
          )}
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

              // Usar los sets pre-calculados para determinar headers
              const showDayHeader = rowsWithDayHeader.has(vRow.index);
              const showShiftHeader = rowsWithShiftHeader.has(vRow.index);
              const currentShift = showShiftHeader ? getShiftForReservation(r.datetime_utc, r.tz || defaultTz) : null;

              // Calcular texto del día si necesario
              let dayHeaderText = "";
              if (showDayHeader) {
                const d = new Date(r.datetime_utc);
                dayHeaderText = d.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long"
                });
                dayHeaderText = dayHeaderText.charAt(0).toUpperCase() + dayHeaderText.slice(1);
              }

              return (
                <div
                  key={r.id}
                  className="absolute left-0 right-0"
                  style={{ transform: `translateY(${vRow.start}px)` }}
                >
                  {/* Header de día (vista multi-día) */}
                  {showDayHeader && (
                    <div className="px-3 md:px-5 py-2 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-800/40 border-b border-zinc-200 dark:border-zinc-700">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {dayHeaderText}
                      </span>
                    </div>
                  )}
                  {showShiftHeader && currentShift && (
                    <div className={`px-3 md:px-5 py-2 border-b ${getShiftColors(currentShift.name)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="text-sm">{currentShift.emoji}</span>
                          {currentShift.name}
                          <span className="text-[11px] font-normal opacity-75">
                            {currentShift.startTime} - {currentShift.endTime}
                          </span>
                        </span>
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
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
        px-3 md:px-5 py-2.5 md:py-2
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
        <div className="flex items-center justify-between gap-2 mt-1">
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

      {/* Vista desktop: fila compacta en una línea */}
      <div className="hidden md:flex items-center gap-3 text-[13px]">
        {/* Hora - destacada */}
        <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums w-12">
          {time}
        </div>

        {/* Nombre - principal */}
        <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate min-w-0 flex-1">
          {r.name}
        </div>

        {/* Comensales */}
        <div className="text-zinc-600 dark:text-zinc-400 w-14 text-center">
          {r.party_size ?? "—"} pax
        </div>

        {/* Teléfono */}
        <div className="text-zinc-500 dark:text-zinc-500 truncate w-28">
          {r.phone ?? "—"}
        </div>

        {/* Localizador */}
        <div className="font-mono text-[12px] text-zinc-400 w-20">
          #{r.locator ?? r.id.slice(0, 6)}
        </div>

        {/* Estado */}
        <div className="w-24">
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
    console.log("[handleStatusChange] Starting - newStatus:", newStatus, "reservationId:", reservation.id);
    setSaving(true);
    setError(null);
    try {
      console.log("[handleStatusChange] Calling updateReservationStatus...");
      const result = await updateReservationStatus({
        reservationId: reservation.id,
        status: newStatus,
      });
      console.log("[handleStatusChange] updateReservationStatus returned:", result);
      console.log("[handleStatusChange] Calling onUpdated...");
      // Llamar onUpdated de forma que errores del refresh no bloqueen el flujo
      try {
        onUpdated();
      } catch (refreshErr) {
        console.error("[handleStatusChange] onUpdated error (ignorado):", refreshErr);
      }
      console.log("[handleStatusChange] onUpdated completed");
    } catch (err: unknown) {
      console.error("[handleStatusChange] Error caught:", err);
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

                {/* Reconfirmada */}
                <button
                  disabled={saving}
                  className="
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-teal-500/40
                    bg-teal-500/10 text-teal-700 dark:text-teal-200
                    hover:bg-teal-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("reconfirmed")}
                >
                  Reconfirmada
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

// Tipo para cliente encontrado
type FoundCustomer = {
  id: string;
  name: string | null;
  phone: string;
  totalReservations: number;
  totalNoShows: number;
  totalCancellations: number;
  lastVisitAt: string | null;
  notes: string | null;
};

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
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("20:00");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"phone" | "walkin">("phone");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para búsqueda de cliente
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<FoundCustomer | null>(null);
  const [customerSearched, setCustomerSearched] = useState(false);

  // Estado para ocupación del turno
  const [shiftOccupancy, setShiftOccupancy] = useState<{
    shiftName: string;
    currentCovers: number;
    totalCapacity: number;
    availableSpots: number;
    utilizationPercent: number;
  } | null>(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  // Estado para controlar el popover del calendario
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Función para normalizar teléfono
  const normalizePhoneForSearch = (p: string): string => {
    const cleaned = p.trim().replace(/\s+/g, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    return "+34" + cleaned;
  };

  // Buscar cliente cuando cambia el teléfono (con debounce)
  useEffect(() => {
    if (!restaurantId) return;

    const normalized = normalizePhoneForSearch(phone);
    if (normalized.length < 10) {
      setFoundCustomer(null);
      setCustomerSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(normalized)}&restaurantId=${restaurantId}`);
        const data = await res.json();
        setCustomerSearched(true);
        if (data.found && data.customer) {
          setFoundCustomer(data.customer);
          // Autorellenar nombre si el cliente tiene uno guardado y el campo está vacío
          if (data.customer.name && !name) {
            setName(data.customer.name);
          }
        } else {
          setFoundCustomer(null);
        }
      } catch (err) {
        console.error("Error buscando cliente:", err);
        setFoundCustomer(null);
      } finally {
        setSearchingCustomer(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [phone, restaurantId]);

  // Buscar ocupación del turno cuando cambia fecha/hora (con debounce)
  // Usamos getTime() para comparar fechas por valor, no por referencia
  const dateTimestamp = date?.getTime();

  useEffect(() => {
    if (!restaurantId || !date || !time) {
      setShiftOccupancy(null);
      setLoadingOccupancy(false);
      return;
    }

    // Mostrar loading mientras esperamos el debounce
    setLoadingOccupancy(true);

    const timer = setTimeout(async () => {
      try {
        // Construir datetime UTC
        const [hourStr, minuteStr] = time.split(":");
        const dt = new Date(date);
        dt.setHours(Number(hourStr), Number(minuteStr), 0, 0);

        const res = await fetch(`/api/shift-occupancy?restaurantId=${restaurantId}&datetimeUtc=${dt.toISOString()}`);
        const data = await res.json();

        if (data.found && data.occupancy) {
          setShiftOccupancy({
            shiftName: data.shift.name,
            currentCovers: data.occupancy.currentCovers,
            totalCapacity: data.occupancy.totalCapacity,
            availableSpots: data.occupancy.availableSpots,
            utilizationPercent: data.occupancy.utilizationPercent,
          });
        } else {
          setShiftOccupancy(null);
        }
      } catch (err) {
        console.error("Error obteniendo ocupación:", err);
        setShiftOccupancy(null);
      } finally {
        setLoadingOccupancy(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [dateTimestamp, time, restaurantId]); // Usar dateTimestamp en lugar de date

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
      // Normalize phone: add +34 prefix if Spanish number without prefix
      let normalizedPhone: string | null = null;
      if (phone) {
        const cleaned = phone.replace(/\s+/g, '').trim();
        if (cleaned) {
          if (cleaned.startsWith('+')) {
            // Already has international prefix
            normalizedPhone = cleaned;
          } else if (cleaned.startsWith('00')) {
            // International format with 00 prefix -> convert to +
            normalizedPhone = '+' + cleaned.slice(2);
          } else if (/^[67]\d{8}$/.test(cleaned)) {
            // Spanish mobile (6xx or 7xx, 9 digits) -> add +34
            normalizedPhone = '+34' + cleaned;
          } else if (/^9\d{8}$/.test(cleaned)) {
            // Spanish landline (9xx, 9 digits) -> add +34
            normalizedPhone = '+34' + cleaned;
          } else {
            // Keep as-is (might be partial or other format)
            normalizedPhone = cleaned;
          }
        }
      }

      await createReservation({
        tenantId,
        restaurantId: restaurantId || undefined,
        name: name.trim(),
        phone: normalizedPhone,
        party_size: numericPartySize,
        datetime_utc: dt.toISOString(),
        notes: notes || null,
        source: source,
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

          {/* Origen de la reserva - PRIMERO */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Tipo de reserva</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSource("phone")}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${source === "phone"
                    ? "bg-indigo-500/15 border-indigo-400/60 text-indigo-700 dark:text-indigo-200"
                    : "bg-white dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }
                `}
              >
                📞 Teléfono
              </button>
              <button
                type="button"
                onClick={() => setSource("walkin")}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${source === "walkin"
                    ? "bg-indigo-500/15 border-indigo-400/60 text-indigo-700 dark:text-indigo-200"
                    : "bg-white dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }
                `}
              >
                🚶 Presencial
              </button>
            </div>
          </div>

          {/* Teléfono - para buscar cliente */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Teléfono</div>
            <div className="relative">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm pr-8"
                placeholder="+34 600 000 000"
              />
              {searchingCustomer && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Badge de cliente conocido - diseño premium compacto */}
          {foundCustomer && (
            <div className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-zinc-800/60 dark:to-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-200">
                      {foundCustomer.name || "Cliente habitual"}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">
                      {foundCustomer.totalReservations} reserva{foundCustomer.totalReservations !== 1 ? "s" : ""}
                    </span>
                    {foundCustomer.totalNoShows > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded">
                        {foundCustomer.totalNoShows} no-show{foundCustomer.totalNoShows !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {foundCustomer.lastVisitAt && (
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Última: {new Date(foundCustomer.lastVisitAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Indicador de cliente nuevo */}
          {customerSearched && !foundCustomer && phone.trim().length >= 9 && (
            <div className="p-2 rounded-lg bg-sky-50/80 dark:bg-sky-900/20 border border-sky-200/60 dark:border-sky-800/40">
              <div className="flex items-center gap-2 text-xs text-sky-700 dark:text-sky-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Cliente nuevo
              </div>
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

          {/* Comensales */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Comensales *</div>
            <input
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
              inputMode="numeric"
              placeholder="Número de personas"
            />
          </div>

          {/* Fecha + hora */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fecha con popover, igual estilo que en la lista */}
            <div>
              <div className="text-xs text-zinc-500 mb-1">Fecha *</div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                    onSelect={(d) => {
                      setDate(d ?? undefined);
                      setCalendarOpen(false);
                    }}
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

          {/* Indicador de ocupación del turno */}
          {(shiftOccupancy || loadingOccupancy) && (
            <div className={`
              px-3 py-2 rounded-md border transition-colors
              ${loadingOccupancy ? "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700" : ""}
              ${shiftOccupancy && shiftOccupancy.utilizationPercent >= 90 ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/60" : ""}
              ${shiftOccupancy && shiftOccupancy.utilizationPercent >= 70 && shiftOccupancy.utilizationPercent < 90 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/60" : ""}
              ${shiftOccupancy && shiftOccupancy.utilizationPercent < 70 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/60" : ""}
            `}>
              {loadingOccupancy ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  Consultando ocupación...
                </div>
              ) : shiftOccupancy && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      shiftOccupancy.utilizationPercent >= 90 ? "text-rose-700 dark:text-rose-300" :
                      shiftOccupancy.utilizationPercent >= 70 ? "text-amber-700 dark:text-amber-300" :
                      "text-emerald-700 dark:text-emerald-300"
                    }`}>
                      {shiftOccupancy.shiftName}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {shiftOccupancy.currentCovers}/{shiftOccupancy.totalCapacity} pax
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          shiftOccupancy.utilizationPercent >= 90 ? "bg-rose-500" :
                          shiftOccupancy.utilizationPercent >= 70 ? "bg-amber-500" :
                          "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, shiftOccupancy.utilizationPercent)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${
                      shiftOccupancy.utilizationPercent >= 90 ? "text-rose-600 dark:text-rose-400" :
                      shiftOccupancy.utilizationPercent >= 70 ? "text-amber-600 dark:text-amber-400" :
                      "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {shiftOccupancy.availableSpots} libres
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notas internas */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Notas internas</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm resize-none"
              placeholder="Alergias, peticiones especiales…"
            />
          </div>

          {/* Checkbox enviar confirmación WhatsApp - solo si hay teléfono */}
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
                  El cliente recibirá un mensaje con los detalles y QR de check-in.
                </div>
              </label>
            </div>
          )}

          {/* Info de estado inicial */}
          <div className="text-xs text-zinc-500 pt-2">
            Estado inicial:{" "}
            <span className="font-medium text-emerald-600 dark:text-emerald-300">Confirmada</span>{" "}
            (reservas creadas manualmente).
          </div>

          {/* Botones: Cancelar y Crear reserva */}
          <div className="pt-4 pb-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
                border border-zinc-300 dark:border-zinc-600
                bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
                hover:bg-zinc-50 dark:hover:bg-zinc-700
                transition-colors
              "
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              onClick={handleCreate}
              className="
                flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
                border border-emerald-400/60
                bg-emerald-500 text-white
                hover:bg-emerald-600
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors
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