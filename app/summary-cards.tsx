"use client";

import { useEffect, useState } from "react";
import { getReservationsSummary } from "./actions";

type Props = {
  tenantId: string;
  restaurantId?: string;
  refreshTrigger?: number; // Trigger externo para forzar recarga
};

export function SummaryCards({ tenantId, restaurantId, refreshTrigger }: Props) {
  const [summary, setSummary] = useState({
    today: 0,
    tomorrow: 0,
    weekRest: 0,
    monthRest: 0,
  });
  const [loading, setLoading] = useState(true);

  async function loadSummary() {
    try {
      setLoading(true);
      const data = await getReservationsSummary({
        tenantId,
        restaurantId,
      });
      setSummary(data);
    } catch (err) {
      console.error("Error loading summary:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, restaurantId, refreshTrigger]);

  const items = [
    {
      label: "Hoy",
      value: summary.today,
      subtitle: "Reservas para hoy",
      accent: "from-emerald-400/40 to-emerald-500/10",
    },
    {
      label: "Mañana",
      value: summary.tomorrow,
      subtitle: "Reservas para mañana",
      accent: "from-sky-400/40 to-sky-500/10",
    },
    {
      label: "Resto semana",
      value: summary.weekRest,
      subtitle: "Reservas resto semana",
      accent: "from-amber-400/40 to-amber-500/10",
    },
    {
      label: "Resto mes",
      value: summary.monthRest,
      subtitle: "Hasta fin de mes actual",
      accent: "from-indigo-400/40 to-indigo-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-[#121317]/95 px-4 py-4 shadow-sm"
        >
          <div className={`absolute inset-0 opacity-70 bg-gradient-to-br ${item.accent} pointer-events-none`} />
          <div className="relative flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {item.label}
            </span>
            <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {loading ? (
                <span className="inline-block w-12 h-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              ) : (
                item.value
              )}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {item.subtitle}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
