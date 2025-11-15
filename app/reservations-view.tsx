"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  getReservations,
  Reservation,
  updateReservationStatus,
  updateReservationDetails,
} from "./actions";
import { useVirtualizer } from "@tanstack/react-virtual";

import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

type Props = {
  tenantId: string;
  defaultTz?: string;
  initialStatus?: string; // undefined en "/", "pending" en /pending
};

export function ReservationsView({
  tenantId,
  defaultTz = "Europe/Zurich",
  initialStatus,
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

  // offset para los botones rápidos (Hoy, +1 día)
  const [dayOffset, setDayOffset] = useState(0);

  async function load(initial = false) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getReservations({
        tenantId,
        q,
        status,
        from,
        to,
        limit: 50,
        cursorCreatedAt: initial ? null : nextCursor,
      });
      setRows((prev) => (initial ? res.data : [...prev, ...res.data]));
      setNextCursor(res.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, q, status, from, to]);

  const visibleRows = useMemo(() => {
    // En la vista de pendientes, el backend ya viene filtrado por status = 'pending'
    if (isPendingMode) return rows;

    // En la vista general:
    // - Para filtro "Todos": ocultamos "pending" y "cancelled" (no tiene sentido operativo en la vista diaria)
    // - Para filtros concretos (confirmed, seated, cancelled, no_show, finished):
    //   dejamos que el backend filtre por status, aquí solo nos aseguramos de ocultar "pending" por si acaso.
    if (status === "all") {
      return rows.filter(
        (r) => r.status !== "pending" && r.status !== "cancelled"
      );
    }

    // Filtros concretos: respetamos lo que venga del servidor, pero nunca mostramos "pending" aquí.
    return rows.filter((r) => r.status !== "pending");
  }, [rows, isPendingMode, status]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 8,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    function onScroll() {
      const nearBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 300;

      if (nearBottom && nextCursor && !loading) load(false);
    }

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, loading]);

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

  // Opciones de estado: sin "pending" en la vista normal
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
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, teléfono o localizador"
                className="h-9 w-full md:w-80 rounded-lg border border-zinc-300/60 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-900/60 px-3 text-sm focus:ring-2 focus:ring-indigo-400/30 outline-none"
              />

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

            {/* Rango + botones rápidos */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                Ver reservas de:
              </span>

              {/* HOY */}
              <button
                onClick={() => setDayRange(0)}
                className={`
                  text-sm px-3 py-1.5 rounded-lg font-medium
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
                onClick={() => setDayRange(dayOffset + 1)}
                className={`
                  text-sm px-3 py-1.5 rounded-lg font-medium
                  ${
                    dayOffset > 0
                      ? "bg-indigo-600 text-white"
                      : "bg-white/70 dark:bg-zinc-900/50 border border-zinc-400/40 dark:border-zinc-700/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70"
                  }
                `}
              >
                +1 día
              </button>

              {/* DatePicker Desde */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="
                      h-9 px-3 rounded-lg border border-zinc-300/60 dark:border-zinc-700/60
                      bg-white/80 dark:bg-zinc-900/60 text-sm flex items-center gap-2
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
                    onSelect={(d) => setFrom(d ? d.toISOString() : "")}
                  />
                </PopoverContent>
              </Popover>

              {/* DatePicker Hasta */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="
                      h-9 px-3 rounded-lg border border-zinc-300/60 dark:border-zinc-700/60
                      bg-white/80 dark:bg-zinc-900/60 text-sm flex items-center gap-2
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
                    onSelect={(d) => setTo(d ? d.toISOString() : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="px-3 md:px-4 pt-3 mb-5">
          <div className="bg-[#1c1e24] ring-1 ring-zinc-900/10 dark:ring:white/10 rounded-md shadow-sm overflow-hidden">
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
                  className="text-left font-medium text-[15px] text-zinc-400 relative"
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
              return (
                <div
                  key={r.id}
                  className="absolute left-0 right-0"
                  style={{ transform: `translateY(${vRow.start}px)` }}
                >
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
            load(true);
          }}
          isPendingMode={isPendingMode}
        />
      )}
    </>
  );
}

/* -------------------------- STATUS CHIP -------------------------- */

function StatusChip({ s }: { s?: string }) {
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

  return (
    <span
      className={`inline-flex items-center justify-center gap-2 h-6 px-3 rounded-full text-xs border min-w-[120px] ${k.bg} ${k.txt} ${k.brd}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${k.dot}`} />
      {k.label}
    </span>
  );
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
        px-6 py-3.5
        text-sm transition-colors
        hover:bg-black/[.025] dark:hover:bg-white/[.035]
        border-b border-zinc-200/40 dark:border-zinc-800/40
        cursor-pointer
      "
    >
      <div className="grid grid-cols-[1fr_1.2fr_.9fr_1fr_1fr_auto] gap-4 items-center">
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
          <StatusChip s={r.status} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------- DRAWER --------------------------- */

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

  const fecha = dtUtc
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: tz,
    })
    .replace(".", "");

  const hora = dtUtc.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });

  const [phone, setPhone] = useState<string>(reservation.phone ?? "");
  const [partySize, setPartySize] = useState<string>(
    reservation.party_size?.toString() ?? ""
  );
  const [notes, setNotes] = useState<string>(reservation.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateReservationDetails({
        reservationId: reservation.id,
        phone: phone || null,
        party_size: partySize ? Number(partySize) : null,
        notes: notes || null,
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    try {
      await updateReservationStatus({
        reservationId: reservation.id,
        status: newStatus,
      });
      onUpdated();
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
          bg-[#0b0b0d] text-zinc-100
          border-l border-zinc-800
          shadow-2xl
          flex flex-col
        "
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-zinc-500">Reserva</div>
            <div className="text-base font-semibold">
              {reservation.name || "Sin nombre"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 text-sm"
          >
            Cerrar
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {/* Fecha y hora */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Fecha y hora</div>
            <div className="text-sm font-medium">
              {fecha} · {hora}
            </div>
          </div>

          {/* Comensales / Teléfono */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-zinc-500.mb-1">Comensales</div>
              <input
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700 px-2 py-1 text-sm"
                inputMode="numeric"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Teléfono</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700 px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* Localizador / Origen */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-zinc-500.mb-1">Localizador</div>
              <div className="font-mono text-[13px] text-zinc-300">
                #{reservation.locator ?? reservation.id.slice(0, 8)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Origen</div>
              <div className="text-sm">{reservation.source ?? "—"}</div>
            </div>
          </div>

          {/* Estado actual */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Estado actual</div>
            <StatusChip s={reservation.status} />
          </div>

          {/* Notas internas */}
          <div className="pt-2">
            <div className="text-xs text-zinc-500 mb-1">Notas internas</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700 px-2 py-1 text-sm resize-none"
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
                bg-indigo-500/10 text-indigo-100
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
                    bg-emerald-500/10 text-emerald-200
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
                    bg-rose-500/10 text-rose-200
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
              <div className="flex gap-2 flex-nowrap">
                {/* Confirmada */}
                <button
                  disabled={saving}
                  className="
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-emerald-500/40
                    bg-emerald-500/10 text-emerald-200
                    hover:bg-emerald-500/20
                    disabled:opacity-60
                    whitespace-nowrap
                  "
                  onClick={() => handleStatusChange("confirmed")}
                >
                  Confirmada
                </button>

                {/* Sentada */}
                <button
                  disabled={saving}
                  className="
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-sky-500/40
                    bg-sky-500/10 text-sky-200
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
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-zinc-500/40
                    bg-zinc-500/10 text-zinc-100
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
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-rose-400/50
                    bg-rose-500/10 text-rose-200
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
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    border border-amber-400/50
                    bg-amber-500/10 text-amber-200
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