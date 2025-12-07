"use client";

import { Users, TrendingUp, Clock, Activity, CheckCircle2, Clock4, UserCheck, Flag, XCircle } from "lucide-react";

interface OccupancyRealTimeViewProps {
  data: {
    turn: string;
    currentGuests: number;
    maxCapacity: number;
    percentage: number;
    statusBreakdown?: {
      confirmed: number;
      pending: number;
      seated: number;
      finished: number;
      no_show: number;
    };
  }[];
}

export function OccupancyRealTimeView({ data }: OccupancyRealTimeViewProps) {
  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500 bg-red-500/10";
    if (percentage >= 70) return "text-amber-500 bg-amber-500/10";
    if (percentage >= 50) return "text-emerald-500 bg-emerald-500/10";
    return "text-sky-500 bg-sky-500/10";
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    if (percentage >= 50) return "bg-emerald-500";
    return "bg-sky-500";
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Ocupación en Tiempo Real
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay datos de ocupación disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Ocupación en Tiempo Real
        </h3>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="relative flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">En vivo</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <Clock className="w-3.5 h-3.5" />
          <span>Actualizado hace 1 min</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((turn, index) => (
          <div
            key={index}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-zinc-600 hover:shadow-md dark:hover:shadow-none transition-all duration-200 group shadow-sm dark:shadow-none"
          >
            {/* Turn Name */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{turn.turn}</h4>
              <div
                className={`px-2 py-1 rounded-md text-xs font-medium ${getOccupancyColor(
                  turn.percentage
                )}`}
              >
                {turn.percentage.toFixed(0)}%
              </div>
            </div>

            {/* Guests Count */}
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {turn.currentGuests}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">/ {turn.maxCapacity}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 animate-shimmer ${getProgressBarColor(
                  turn.percentage
                )}`}
                style={{ width: `${Math.min(turn.percentage, 100)}%` }}
              />
            </div>

            {/* Status Breakdown */}
            {turn.statusBreakdown && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                {turn.statusBreakdown.seated > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                      <span className="text-zinc-500 dark:text-zinc-400">Sentados</span>
                    </div>
                    <span className="text-sky-600 dark:text-sky-400 font-medium">{turn.statusBreakdown.seated}</span>
                  </div>
                )}
                {turn.statusBreakdown.confirmed > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-zinc-500 dark:text-zinc-400">Confirmados</span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{turn.statusBreakdown.confirmed}</span>
                  </div>
                )}
                {turn.statusBreakdown.pending > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock4 className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                      <span className="text-zinc-500 dark:text-zinc-400">Pendientes</span>
                    </div>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{turn.statusBreakdown.pending}</span>
                  </div>
                )}
                {turn.statusBreakdown.finished > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      <span className="text-zinc-500 dark:text-zinc-400">Finalizados</span>
                    </div>
                    <span className="text-zinc-600 dark:text-zinc-500 font-medium">{turn.statusBreakdown.finished}</span>
                  </div>
                )}
                {turn.statusBreakdown.no_show > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-fuchsia-500 dark:text-fuchsia-400" />
                      <span className="text-zinc-500 dark:text-zinc-400">No show</span>
                    </div>
                    <span className="text-fuchsia-600 dark:text-fuchsia-400 font-medium">{turn.statusBreakdown.no_show}</span>
                  </div>
                )}
              </div>
            )}

            {/* Available Seats - now below status breakdown */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              {turn.maxCapacity - turn.currentGuests} plazas disponibles
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
