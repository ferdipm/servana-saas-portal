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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Ocupación en Tiempo Real
        </h3>
        <p className="text-sm text-zinc-400">No hay datos de ocupación disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Ocupación en Tiempo Real
        </h3>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Clock className="w-4 h-4" />
          Actualizado hace 1 min
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((turn, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-zinc-800 to-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-all duration-200 group"
          >
            {/* Turn Name */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-200">{turn.turn}</h4>
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
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-zinc-100">
                {turn.currentGuests}
              </span>
              <span className="text-sm text-zinc-400">/ {turn.maxCapacity}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(
                  turn.percentage
                )}`}
                style={{ width: `${Math.min(turn.percentage, 100)}%` }}
              />
            </div>

            {/* Status Breakdown */}
            {turn.statusBreakdown && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-700">
                {turn.statusBreakdown.seated > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-sky-400" />
                      <span className="text-zinc-400">Sentados</span>
                    </div>
                    <span className="text-sky-400 font-medium">{turn.statusBreakdown.seated}</span>
                  </div>
                )}
                {turn.statusBreakdown.confirmed > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-zinc-400">Confirmados</span>
                    </div>
                    <span className="text-emerald-400 font-medium">{turn.statusBreakdown.confirmed}</span>
                  </div>
                )}
                {turn.statusBreakdown.pending > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock4 className="w-3 h-3 text-amber-400" />
                      <span className="text-zinc-400">Pendientes</span>
                    </div>
                    <span className="text-amber-400 font-medium">{turn.statusBreakdown.pending}</span>
                  </div>
                )}
                {turn.statusBreakdown.finished > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-400">Finalizados</span>
                    </div>
                    <span className="text-zinc-500 font-medium">{turn.statusBreakdown.finished}</span>
                  </div>
                )}
                {turn.statusBreakdown.no_show > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-fuchsia-400" />
                      <span className="text-zinc-400">No show</span>
                    </div>
                    <span className="text-fuchsia-400 font-medium">{turn.statusBreakdown.no_show}</span>
                  </div>
                )}
              </div>
            )}

            {/* Available Seats - now below status breakdown */}
            <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-700">
              {turn.maxCapacity - turn.currentGuests} plazas disponibles
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
