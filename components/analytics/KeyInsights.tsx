"use client";

import { Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface KeyInsightsProps {
  data: {
    totalReservations: number;
    totalGuests: number;
    avgPartySize: number;
    occupancyRate: number;
    trends: {
      reservations: number;
      guests: number;
      avgPartySize: number;
      occupancyRate: number;
    };
    reservationsByDay: {
      date: string;
      count: number;
      guests: number;
    }[];
    reservationsByTime: {
      hour: number;
      count: number;
      guests: number;
    }[];
    reservationsByTurn: {
      turn: string;
      count: number;
      guests: number;
      capacity: number;
    }[];
    reservationsBySources: {
      source: string;
      count: number;
      percentage: number;
    }[];
  };
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: "positive" | "neutral" | "warning";
}

export function KeyInsights({ data }: KeyInsightsProps) {
  const insights: Insight[] = [];

  // 1. Día más ocupado
  if (data.reservationsByDay.length > 0) {
    const busiestDay = data.reservationsByDay.reduce((max, day) =>
      day.count > max.count ? day : max
    );
    const dayName = format(parseISO(busiestDay.date), "EEEE", { locale: es });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    insights.push({
      icon: <TrendingUp className="w-4 h-4" />,
      text: `${capitalizedDayName} es tu día con más reservas (${busiestDay.count} reservas, ${busiestDay.guests} comensales)`,
      type: "positive",
    });
  }

  // 2. Turno con mayor ocupación
  if (data.reservationsByTurn.length > 0) {
    const busiestTurn = data.reservationsByTurn.reduce((max, turn) => {
      const occupancy = (turn.guests / turn.capacity) * 100;
      const maxOccupancy = (max.guests / max.capacity) * 100;
      return occupancy > maxOccupancy ? turn : max;
    });
    const occupancyRate = ((busiestTurn.guests / busiestTurn.capacity) * 100).toFixed(0);

    insights.push({
      icon: <TrendingUp className="w-4 h-4" />,
      text: `${busiestTurn.turn} tiene la mayor ocupación (${occupancyRate}% de capacidad)`,
      type: parseInt(occupancyRate) >= 80 ? "positive" : "neutral",
    });
  }

  // 3. Canal principal de reservas
  if (data.reservationsBySources.length > 0) {
    const topSource = data.reservationsBySources.reduce((max, source) =>
      source.count > max.count ? source : max
    );

    insights.push({
      icon: <Lightbulb className="w-4 h-4" />,
      text: `${topSource.source} es tu canal principal (${topSource.percentage.toFixed(0)}% de reservas)`,
      type: "neutral",
    });
  }

  // 4. Hora pico
  if (data.reservationsByTime.length > 0) {
    const peakHour = data.reservationsByTime.reduce((max, time) =>
      time.count > max.count ? time : max
    );

    insights.push({
      icon: <TrendingUp className="w-4 h-4" />,
      text: `${peakHour.hour}:00-${peakHour.hour + 1}:00 es tu franja horaria más solicitada (${peakHour.count} reservas)`,
      type: "positive",
    });
  }

  // 5. Tendencia general
  const trend = data.trends.reservations;
  if (trend !== 0) {
    const trendIcon = trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
    const trendText = trend > 0
      ? `Tus reservas crecieron ${Math.abs(trend).toFixed(1)}% comparado con el período anterior`
      : `Tus reservas bajaron ${Math.abs(trend).toFixed(1)}% comparado con el período anterior`;

    insights.push({
      icon: trendIcon,
      text: trendText,
      type: trend > 0 ? "positive" : "warning",
    });
  }

  // 6. Insight de ocupación baja si aplica
  const lowOccupancyTurns = data.reservationsByTurn.filter(turn => {
    const occupancy = (turn.guests / turn.capacity) * 100;
    return occupancy < 50;
  });

  if (lowOccupancyTurns.length > 0) {
    const turn = lowOccupancyTurns[0];
    const occupancy = ((turn.guests / turn.capacity) * 100).toFixed(0);

    insights.push({
      icon: <Lightbulb className="w-4 h-4" />,
      text: `${turn.turn} tiene baja ocupación (${occupancy}%) - considera promociones para este turno`,
      type: "warning",
    });
  }

  const getTypeStyles = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
      case "neutral":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <Lightbulb className="w-5 h-5 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Insights Clave</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getTypeStyles(insight.type)} transition-all hover:scale-[1.02]`}
          >
            <div className="mt-0.5">{insight.icon}</div>
            <p className="text-sm leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
