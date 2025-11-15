import { getReservationsSummary } from "./actions";

type Props = {
  tenantId: string;
};

export async function SummaryCards({ tenantId }: Props) {
  const { today, tomorrow, weekRest, monthRest } = await getReservationsSummary({ tenantId });

  const items = [
    {
      label: "Hoy",
      value: today,
      subtitle: "Reservas para hoy",
      accent: "from-emerald-400/40 to-emerald-500/10",
    },
    {
      label: "Mañana",
      value: tomorrow,
      subtitle: "Reservas para mañana",
      accent: "from-sky-400/40 to-sky-500/10",
    },
    {
      label: "Resto semana",
      value: weekRest,
      subtitle: "Reservas resto semana",
      accent: "from-amber-400/40 to-amber-500/10",
    },
    {
      label: "Resto mes",
      value: monthRest,
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
              {item.value}
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
