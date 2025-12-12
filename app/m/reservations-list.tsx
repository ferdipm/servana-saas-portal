"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getReservations, Reservation, updateReservationStatus, createReservation, getRestaurantShiftsForDate, Shift } from "../actions";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { DatePickerModal } from "./date-picker-modal";

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
  // Rango de fechas para vista multi-día
  const [dateRange, setDateRange] = useState<"day" | "week" | "month" | "custom">("day");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Estado para el date picker modal
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Helper: obtener inicio de semana (lunes)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para lunes
    d.setDate(diff);
    return d;
  };

  // Helper: obtener fin de semana (domingo)
  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  };

  // Helper: obtener inicio de mes
  const getMonthStart = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  };

  // Helper: obtener fin de mes
  const getMonthEnd = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // Último día del mes anterior (actual)
    return d;
  };

  // Navegación: avanzar según el modo
  const goToNext = () => {
    if (dateRange === "day") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
      });
    } else if (dateRange === "week") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 7);
        return newDate;
      });
      setEndDate(prev => {
        if (!prev) return null;
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 7);
        return newDate;
      });
    } else if (dateRange === "month") {
      // Para mes: avanzar al inicio del mes siguiente
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setDate(1); // Ir al día 1 del mes siguiente
        return newDate;
      });
      setEndDate(prev => {
        if (!prev) return null;
        // Calcular el fin del mes siguiente basado en el mes actual + 1
        const newDate = new Date(prev);
        newDate.setDate(1); // Ir al día 1
        newDate.setMonth(newDate.getMonth() + 1); // Mes siguiente
        return getMonthEnd(newDate);
      });
    }
  };

  // Navegación: retroceder según el modo
  const goToPrevious = () => {
    if (dateRange === "day") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 1);
        return newDate;
      });
    } else if (dateRange === "week") {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 7);
        return newDate;
      });
      setEndDate(prev => {
        if (!prev) return null;
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 7);
        return newDate;
      });
    } else if (dateRange === "month") {
      // Para mes: retroceder al inicio del mes anterior
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() - 1);
        newDate.setDate(1); // Ir al día 1 del mes anterior
        return newDate;
      });
      setEndDate(prev => {
        if (!prev) return null;
        // Calcular el fin del mes anterior
        const newDate = new Date(prev);
        newDate.setDate(1); // Ir al día 1
        newDate.setMonth(newDate.getMonth() - 1); // Mes anterior
        return getMonthEnd(newDate);
      });
    }
  };

  // Cambiar a vista Hoy
  const setTodayView = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    setEndDate(null);
    setDateRange("day");
  };

  // Cambiar a vista Semana (desde hoy hasta el domingo)
  const setWeekView = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = getWeekEnd(today);
    setSelectedDate(today);
    setEndDate(weekEnd);
    setDateRange("week");
  };

  // Cambiar a vista Mes (desde hoy hasta fin de mes)
  const setMonthView = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthEnd = getMonthEnd(today);
    setSelectedDate(today);
    setEndDate(monthEnd);
    setDateRange("month");
  };

  // Verificar si estamos en el periodo actual (empezando desde hoy)
  const isCurrentPeriod = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "day") {
      return selectedDate.getTime() === today.getTime();
    } else if (dateRange === "week" || dateRange === "month") {
      // Ahora semana y mes empiezan desde hoy
      return selectedDate.getTime() === today.getTime();
    }
    return false;
  };

  // Calcular el rango de fechas efectivo
  const getEffectiveDateRange = () => {
    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);

    let to: Date;
    if (dateRange === "day" || !endDate) {
      to = new Date(from);
      to.setDate(to.getDate() + 1);
    } else {
      to = new Date(endDate);
      to.setDate(to.getDate() + 1);
      to.setHours(0, 0, 0, 0);
    }

    return { from, to };
  };

  // Formato de rango para mostrar
  const formatDateRangeLabel = () => {
    if (dateRange === "day") {
      return formatSelectedDate();
    }

    // Para semana, mes y custom mostrar "del X al Y"
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
  };

  // Formatear rango para el header de la lista
  const formatRangeHeader = () => {
    if (dateRange === "day" || !endDate) return null;

    const startDay = selectedDate.getDate();
    const endDay = endDate.getDate();
    const startMonth = selectedDate.toLocaleDateString("es-ES", { month: "long" });
    const endMonth = endDate.toLocaleDateString("es-ES", { month: "long" });

    if (startMonth === endMonth) {
      return `Del ${startDay} al ${endDay} de ${startMonth}`;
    }
    return `Del ${startDay} de ${startMonth} al ${endDay} de ${endMonth}`;
  };

  // Handler para selección de rango de fechas (usado por DatePickerModal)
  const handleRangeSelect = (from: Date, to: Date) => {
    setSelectedDate(from);
    setEndDate(to);
    setDateRange("custom");
  };

  // Estado para resultados de búsqueda (separado de rows del día actual)
  const [searchResults, setSearchResults] = useState<Reservation[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Turnos del restaurante para la fecha seleccionada
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Búsqueda en servidor (hoy + futuro)
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // Buscar desde hace 1 día para incluir reservas de hoy temprano (problemas de timezone)
        // y hasta 1 año en el futuro
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 1);

        const res = await getReservations({
          tenantId,
          restaurantId,
          q: searchQuery,
          status: "all",
          from: yesterday.toISOString(),
          to: farFuture.toISOString(),
          limit: 50,
          cursorCreatedAt: null,
        });
        setSearchResults(res.data);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, tenantId, restaurantId]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Mostrar resultados de búsqueda o reservas del día
  const displayRows = searchQuery.trim() ? searchResults : rows;
  const isSearchMode = searchQuery.trim().length > 0;

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

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const { from: fromDate, to: toDate } = getEffectiveDateRange();

      const from = fromDate.toISOString();
      const to = toDate.toISOString();

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

      // Cargar turnos para la fecha seleccionada (solo en modo "today" y vista de un día)
      if (mode === "today" && dateRange === "day") {
        const shiftsData = await getRestaurantShiftsForDate(restaurantId, selectedDate);
        setShifts(shiftsData);
      } else {
        setShifts([]); // No mostrar turnos en vista multi-día
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, restaurantId, mode, selectedDate, dateRange, endDate]);

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

  // Función helper para convertir hora a minutos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Determina en qué turno cae una reserva basado en su hora
  const getShiftForReservation = (dateStr: string, tz: string): Shift | null => {
    if (shifts.length === 0) return null;

    const dt = new Date(dateStr);
    const timeStr = dt.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
    const reservationMinutes = timeToMinutes(timeStr);

    for (const shift of shifts) {
      const startMinutes = timeToMinutes(shift.startTime);
      let endMinutes = timeToMinutes(shift.endTime);

      // Manejar turnos que cruzan medianoche
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
        if (reservationMinutes < startMinutes) {
          const adjustedReservation = reservationMinutes + 24 * 60;
          if (adjustedReservation >= startMinutes && adjustedReservation <= endMinutes) {
            return shift;
          }
        }
      }

      if (reservationMinutes >= startMinutes && reservationMinutes <= endMinutes) {
        return shift;
      }
    }

    return null;
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Botón Nueva Reserva + Selector de día (solo en modo today) - Header fijo */}
      {mode === "today" && (
        <div className="flex-shrink-0 bg-zinc-50 dark:bg-[#0a0a0c] px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5">
          {/* Fila: Nueva Reserva + Búsqueda inline */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewReservation(true)}
              className="py-2 px-4 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Reserva
            </button>
            {/* Campo de búsqueda inline */}
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-8 py-2 rounded-lg text-base border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searching ? (
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Selector de rango: Hoy | Semana | Mes + botones -/+ + calendarios */}
          <div className="flex items-stretch gap-2">
            {/* Grupo principal de navegación */}
            <div className="flex-1 flex items-stretch gap-1 bg-white dark:bg-zinc-800/80 rounded-xl p-1 border border-zinc-200 dark:border-zinc-700">
              {/* Botón retroceder */}
              <button
                onClick={goToPrevious}
                className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors active:scale-95"
                aria-label="Anterior"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Presets: Hoy, Semana, Mes */}
              <div className="flex-1 flex items-center justify-center gap-1">
                <button
                  onClick={setTodayView}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    dateRange === "day"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95"
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={setWeekView}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    dateRange === "week"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95"
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={setMonthView}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    dateRange === "month"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95"
                  }`}
                >
                  Mes
                </button>
              </div>

              {/* Botón avanzar */}
              <button
                onClick={goToNext}
                className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors active:scale-95"
                aria-label="Siguiente"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Icono de calendario para rango personalizado */}
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border transition-colors active:scale-95 ${
                dateRange === "custom"
                  ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
              title="Seleccionar rango de fechas"
              aria-label="Seleccionar rango de fechas"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h8m-4 5h4" />
              </svg>
            </button>
          </div>

          {/* Mostrar rango de fechas actual (si no es el periodo actual o es custom) */}
          {(!isCurrentPeriod() || dateRange === "custom") && (
            <div className="text-center text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {formatDateRangeLabel()}
            </div>
          )}
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
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="text-4xl mb-3">
              {searchQuery ? "🔍" : mode === "pending" ? "✅" : "📅"}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
              {searchQuery
                ? "No se encontraron resultados"
                : mode === "pending"
                ? "No hay reservas pendientes"
                : dateRange === "week"
                ? `No hay reservas del ${formatDateRangeLabel()}`
                : dateRange === "month"
                ? `No hay reservas en ${formatDateRangeLabel()}`
                : `No hay reservas para ${formatSelectedDate().toLowerCase()}`}
            </p>
          </div>
        ) : (
          <>
            {/* Header del rango de fechas (para vistas multi-día) */}
            {!isSearchMode && formatRangeHeader() && (
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    {formatRangeHeader()}
                  </span>
                  <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                    {displayRows.length} reserva{displayRows.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 pb-20">
            {displayRows.map((r, index) => {
              // En modo búsqueda o vista multi-día, mostrar separador de día si cambia
              const isMultiDayView = dateRange !== "day";
              const showDayHeader = (isSearchMode || isMultiDayView) && (() => {
                const currentDate = new Date(r.datetime_utc).toDateString();
                const prevDate = index > 0 ? new Date(displayRows[index - 1].datetime_utc).toDateString() : null;
                return index === 0 || currentDate !== prevDate;
              })();

              // En modo normal (no búsqueda) y vista de un día, mostrar header de turno si cambia
              const currentShift = !isSearchMode && mode === "today" && dateRange === "day" ? getShiftForReservation(r.datetime_utc, r.tz || defaultTz) : null;
              const prevShift = !isSearchMode && mode === "today" && dateRange === "day" && index > 0
                ? getShiftForReservation(displayRows[index - 1].datetime_utc, displayRows[index - 1].tz || defaultTz)
                : null;
              const showShiftHeader = !isSearchMode && mode === "today" && dateRange === "day" && currentShift && (
                index === 0 || currentShift.name !== prevShift?.name
              );

              const getDayLabel = (dateStr: string, tz: string) => {
                const dt = new Date(dateStr);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dtDate = new Date(dt.toLocaleDateString("en-US", { timeZone: tz }));
                dtDate.setHours(0, 0, 0, 0);

                if (dtDate.getTime() === today.getTime()) return "Hoy";
                if (dtDate.getTime() === tomorrow.getTime()) return "Mañana";
                return dt.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: tz,
                });
              };

              // Colores según el turno
              const getShiftColors = (shiftName: string) => {
                switch (shiftName) {
                  case "Desayuno":
                    return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300";
                  case "Comida":
                    return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300";
                  case "Cena":
                    return "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300";
                  default:
                    return "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300";
                }
              };

              // Contar reservas del turno actual
              const getShiftReservationCount = (shiftName: string) => {
                return displayRows.filter(res => {
                  const resShift = getShiftForReservation(res.datetime_utc, res.tz || defaultTz);
                  return resShift?.name === shiftName;
                }).length;
              };

              return (
                <li key={r.id}>
                  {/* Header de turno (modo normal) */}
                  {showShiftHeader && currentShift && (
                    <div className={`sticky top-0 z-10 px-4 py-2.5 border-b ${getShiftColors(currentShift.name)}`}>
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
                  {/* Separador de día en búsqueda o vista multi-día */}
                  {showDayHeader && (
                    <div className={`sticky top-0 z-10 px-4 py-2 border-b ${
                      isSearchMode
                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50"
                        : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700"
                    }`}>
                      <span className={`text-sm font-semibold capitalize ${
                        isSearchMode
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-zinc-700 dark:text-zinc-200"
                      }`}>
                        {getDayLabel(r.datetime_utc, r.tz || defaultTz)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedReservation(r)}
                    className="w-full text-left px-4 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:bg-zinc-200 dark:active:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Hora y fecha */}
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                            {formatTime(r.datetime_utc, r.tz || defaultTz)}
                          </div>
                          {!isSearchMode && (
                            <div className="text-xs text-zinc-500">
                              {formatDay(r.datetime_utc, r.tz || defaultTz)}
                            </div>
                          )}
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

                      {/* Estado y badges */}
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <StatusBadge status={r.status} />
                        <LateBadge datetimeUtc={r.datetime_utc} status={r.status} />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          </>
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

      {/* Modal de selección de rango de fechas */}
      <DatePickerModal
        isOpen={datePickerOpen}
        fromDate={selectedDate}
        toDate={endDate}
        onRangeSelect={handleRangeSelect}
        onClose={() => setDatePickerOpen(false)}
      />
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
    reconfirmed: {
      bg: "bg-teal-100 dark:bg-teal-900/30",
      text: "text-teal-700 dark:text-teal-300",
      label: "Reconfirmada",
    },
    arrived: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      label: "Llegó",
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

// Hook singleton para tick global cada minuto (evita múltiples timers)
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

function LateBadge({ datetimeUtc, status }: { datetimeUtc: string; status?: string }) {
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
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        Retrasado
      </span>
    );
  }

  return null;
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
            <div className="flex flex-wrap gap-1.5 justify-end">
              <StatusBadge status={reservation.status} />
              <LateBadge datetimeUtc={reservation.datetime_utc} status={reservation.status} />
            </div>
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

          {/* Acciones rápidas - diseño elegante basado en flujo */}
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              Acciones
            </p>

            {isPending ? (
              /* Reserva pendiente: Confirmar o Rechazar */
              <div className="flex gap-3">
                <button
                  onClick={() => onQuickAction(reservation, "confirmed")}
                  className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirmar
                </button>
                <button
                  onClick={() => onQuickAction(reservation, "cancelled")}
                  className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rechazar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Acción principal - siguiente paso en el flujo */}
                {(reservation.status === "confirmed" || reservation.status === "reconfirmed") && (
                  <button
                    onClick={() => onQuickAction(reservation, "arrived")}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Marcar llegada
                  </button>
                )}
                {reservation.status === "arrived" && (
                  <button
                    onClick={() => onQuickAction(reservation, "seated")}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Sentar en mesa
                  </button>
                )}
                {reservation.status === "seated" && (
                  <button
                    onClick={() => onQuickAction(reservation, "finished")}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold bg-zinc-600 hover:bg-zinc-700 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Finalizar servicio
                  </button>
                )}

                {/* Acciones secundarias - todos los estados manuales */}
                {["confirmed", "reconfirmed", "arrived", "seated"].includes(reservation.status || "") && (
                  <>
                    {/* Acciones de avance manual (saltar pasos o corregir) */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {reservation.status !== "reconfirmed" && reservation.status === "confirmed" && (
                        <button
                          onClick={() => onQuickAction(reservation, "reconfirmed")}
                          className="px-3 py-2 rounded-xl text-xs font-medium bg-teal-100 dark:bg-teal-900/30 hover:bg-teal-200 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 transition-colors"
                        >
                          Reconfirmada
                        </button>
                      )}
                      {reservation.status !== "arrived" && (
                        <button
                          onClick={() => onQuickAction(reservation, "arrived")}
                          className="px-3 py-2 rounded-xl text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition-colors"
                        >
                          Llegada
                        </button>
                      )}
                      {reservation.status !== "seated" && (
                        <button
                          onClick={() => onQuickAction(reservation, "seated")}
                          className="px-3 py-2 rounded-xl text-xs font-medium bg-sky-100 dark:bg-sky-900/30 hover:bg-sky-200 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 transition-colors"
                        >
                          Sentada
                        </button>
                      )}
                      {reservation.status !== "finished" && (
                        <button
                          onClick={() => onQuickAction(reservation, "finished")}
                          className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
                        >
                          Finalizada
                        </button>
                      )}
                    </div>
                    {/* Acciones negativas */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onQuickAction(reservation, "no_show")}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 transition-colors"
                      >
                        No show
                      </button>
                      <button
                        onClick={() => onQuickAction(reservation, "cancelled")}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
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
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(2);
  // Usar formato local para evitar problemas de timezone (toISOString convierte a UTC)
  const [date, setDate] = useState(() => {
    const year = defaultDate.getFullYear();
    const month = String(defaultDate.getMonth() + 1).padStart(2, "0");
    const day = String(defaultDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [time, setTime] = useState("13:00");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"phone" | "walkin">("phone");
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
          // Autorellenar nombre si el cliente tiene uno guardado
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
  useEffect(() => {
    if (!date || !time) {
      setShiftOccupancy(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOccupancy(true);
      try {
        const dt = new Date(`${date}T${time}:00`);

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
    }, 300);

    return () => clearTimeout(timer);
  }, [date, time, restaurantId]);

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

      // Normalizar teléfono: añadir +34 si no tiene prefijo internacional
      const normalizePhone = (p: string): string | null => {
        const cleaned = p.trim().replace(/\s+/g, "");
        if (!cleaned) return null;
        // Si ya tiene prefijo internacional, mantenerlo
        if (cleaned.startsWith("+")) return cleaned;
        // Si empieza con 00, convertir a +
        if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
        // Si no tiene prefijo, añadir +34 (España)
        return "+34" + cleaned;
      };

      const normalizedPhone = normalizePhone(phone);

      await createReservation({
        tenantId,
        restaurantId,
        name: name.trim(),
        phone: normalizedPhone,
        party_size: partySize,
        datetime_utc,
        notes: notes.trim() || null,
        source: source,
        tz: defaultTz,
        status: "confirmed",
        sendWhatsAppConfirmation: sendWhatsApp && !!normalizedPhone,
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
            {/* Tipo de reserva - PRIMERO */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Tipo de reserva
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSource("phone")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    source === "phone"
                      ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  📞 Teléfono
                </button>
                <button
                  type="button"
                  onClick={() => setSource("walkin")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    source === "walkin"
                      ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  🚶 Presencial
                </button>
              </div>
            </div>

            {/* Teléfono - para buscar cliente */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Teléfono
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+34 600 000 000"
                />
                {searchingCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Badge de cliente conocido - diseño premium compacto */}
            {foundCustomer && (
              <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-zinc-800/60 dark:to-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                        {foundCustomer.name || "Cliente habitual"}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">
                        {foundCustomer.totalReservations} reserva{foundCustomer.totalReservations !== 1 ? "s" : ""}
                      </span>
                      {foundCustomer.totalNoShows > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded">
                          {foundCustomer.totalNoShows} NS
                        </span>
                      )}
                    </div>
                    {foundCustomer.lastVisitAt && (
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Última: {new Date(foundCustomer.lastVisitAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Indicador de cliente nuevo */}
            {customerSearched && !foundCustomer && phone.trim().length >= 9 && (
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40">
                <div className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Cliente nuevo
                </div>
              </div>
            )}

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

            {/* Checkbox enviar WhatsApp */}
            {phone.trim() && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                <input
                  type="checkbox"
                  id="sendWhatsAppMobile"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="sendWhatsAppMobile" className="flex-1">
                  <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Enviar confirmación por WhatsApp
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    El cliente recibirá un mensaje con detalles y QR de check-in.
                  </div>
                </label>
              </div>
            )}

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

            {/* Indicador de ocupación del turno */}
            {(shiftOccupancy || loadingOccupancy) && (
              <div className={`
                px-3 py-2.5 rounded-xl border transition-colors
                ${loadingOccupancy ? "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700" : ""}
                ${shiftOccupancy && shiftOccupancy.utilizationPercent >= 90 ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/60" : ""}
                ${shiftOccupancy && shiftOccupancy.utilizationPercent >= 70 && shiftOccupancy.utilizationPercent < 90 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/60" : ""}
                ${shiftOccupancy && shiftOccupancy.utilizationPercent < 70 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/60" : ""}
              `}>
                {loadingOccupancy ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    Consultando ocupación...
                  </div>
                ) : shiftOccupancy && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        shiftOccupancy.utilizationPercent >= 90 ? "text-rose-700 dark:text-rose-300" :
                        shiftOccupancy.utilizationPercent >= 70 ? "text-amber-700 dark:text-amber-300" :
                        "text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {shiftOccupancy.shiftName}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {shiftOccupancy.currentCovers}/{shiftOccupancy.totalCapacity} pax
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            shiftOccupancy.utilizationPercent >= 90 ? "bg-rose-500" :
                            shiftOccupancy.utilizationPercent >= 70 ? "bg-amber-500" :
                            "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, shiftOccupancy.utilizationPercent)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
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

          {/* Botones - en fila horizontal */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white transition-colors flex items-center justify-center gap-2"
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
          </div>
        </form>
      </div>
    </>
  );
}

