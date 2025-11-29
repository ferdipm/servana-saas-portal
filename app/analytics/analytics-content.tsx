"use client";

import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  Users,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import { ReservationTrendsChart } from "@/components/analytics/ReservationTrendsChart";
import { OccupancyByTimeChart } from "@/components/analytics/OccupancyByTimeChart";
import { TurnDistributionChart } from "@/components/analytics/TurnDistributionChart";
import { ReservationSourcesChart } from "@/components/analytics/ReservationSourcesChart";
import { OccupancyRealTimeView } from "@/components/analytics/OccupancyRealTimeView";
import { PeriodSelector } from "@/components/analytics/PeriodSelector";
import { ChartHelpButton } from "@/components/analytics/ChartHelpButton";

interface AnalyticsContentProps {
  restaurantId: string;
  tenantId: string;
  initialPeriod: string;
}

interface AnalyticsData {
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
  realTimeOccupancy: {
    turn: string;
    currentGuests: number;
    maxCapacity: number;
    percentage: number;
  }[];
}

export function AnalyticsContent({
  restaurantId,
  tenantId,
  initialPeriod,
}: AnalyticsContentProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/analytics?restaurantId=${restaurantId}&period=${period}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const analyticsData = await response.json();
        console.log("Analytics data received:", analyticsData);

        // Validate data structure
        if (!analyticsData || typeof analyticsData.totalReservations === 'undefined') {
          console.error("Invalid data structure:", analyticsData);
          setData(null);
          return;
        }

        setData(analyticsData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [restaurantId, period]);

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting data...");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <BarChart3 className="w-12 h-12 text-zinc-600" />
          <div>
            <p className="text-zinc-300 font-medium mb-1">No hay datos disponibles</p>
            <p className="text-sm text-zinc-500">
              Verifica la consola del navegador para más detalles
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            Analytics y Ocupación
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Análisis detallado de reservas y ocupación en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Calendar className="w-5 h-5" />}
          label="Total Reservas"
          value={data.totalReservations.toString()}
          trend={data.trends.reservations}
          trendLabel={`${data.trends.reservations > 0 ? '+' : ''}${data.trends.reservations.toFixed(1)}%`}
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Total Comensales"
          value={data.totalGuests.toString()}
          trend={data.trends.guests}
          trendLabel={`${data.trends.guests > 0 ? '+' : ''}${data.trends.guests.toFixed(1)}%`}
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Promedio Personas"
          value={data.avgPartySize.toFixed(1)}
          trend={data.trends.avgPartySize}
          trendLabel={`${data.trends.avgPartySize > 0 ? '+' : ''}${data.trends.avgPartySize.toFixed(1)}%`}
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Tasa de Ocupación"
          value={`${data.occupancyRate.toFixed(0)}%`}
          trend={data.trends.occupancyRate}
          trendLabel={`${data.trends.occupancyRate > 0 ? '+' : ''}${data.trends.occupancyRate.toFixed(1)}%`}
        />
      </div>

      {/* Ocupación en Tiempo Real */}
      <OccupancyRealTimeView data={data.realTimeOccupancy} />

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Reservas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Tendencia de Reservas
            </h3>
            <ChartHelpButton
              title="Tendencia de Reservas"
              description="Este gráfico muestra la evolución del número de reservas y comensales día a día durante el período seleccionado. Cada punto representa las reservas confirmadas para ese día."
              interpretation="Busca patrones y tendencias: ¿Hay días de la semana con más demanda? ¿Hay picos o valles? ¿La tendencia es creciente o decreciente? Esto te ayuda a planificar el staff y recursos necesarios."
            />
          </div>
          <ReservationTrendsChart data={data.reservationsByDay} />
        </div>

        {/* Distribución por Horario */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Distribución por Horario
            </h3>
            <ChartHelpButton
              title="Distribución por Horario"
              description="Muestra la concentración de reservas y comensales por hora del día. Solo incluye las horas donde hay al menos una reserva durante el período seleccionado."
              interpretation="Identifica tus horarios pico y los momentos más tranquilos. Usa esta información para optimizar los turnos del personal, gestionar la cocina eficientemente y preparar promociones en horarios de baja afluencia."
            />
          </div>
          <OccupancyByTimeChart data={data.reservationsByTime} />
        </div>

        {/* Ocupación por Turno */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Ocupación por Turno
            </h3>
            <ChartHelpButton
              title="Ocupación por Turno"
              description="Compara el promedio diario de comensales contra la capacidad total del restaurante para cada turno (Comida y Cena). Las barras apiladas muestran comensales ocupados vs. plazas disponibles."
              interpretation="Los colores indican el nivel de ocupación: verde (<70%), ámbar (70-90%), rojo (>90%). Un turno constantemente en rojo puede indicar oportunidad para ampliar capacidad. Un turno en verde puede beneficiarse de promociones para atraer más clientes."
            />
          </div>
          <TurnDistributionChart data={data.reservationsByTurn} />
        </div>

        {/* Fuentes de Reservas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-sky-500" />
              Fuentes de Reservas
            </h3>
            <ChartHelpButton
              title="Fuentes de Reservas"
              description="Desglosa el porcentaje de reservas según el canal por el que llegaron: WhatsApp, Web, Teléfono, etc. Te ayuda a entender qué canales son más efectivos para tu restaurante."
              interpretation="Si un canal genera muchas reservas, considera potenciarlo con recursos adicionales. Si un canal genera pocas reservas, evalúa si vale la pena mantenerlo o mejorarlo. Conocer tus canales te permite optimizar tu inversión en marketing."
            />
          </div>
          <ReservationSourcesChart data={data.reservationsBySources} />
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  trend,
  trendLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
}) {
  const getTrendIcon = () => {
    if (trend > 0) return <ArrowUp className="w-4 h-4" />;
    if (trend < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-emerald-500";
    if (trend < 0) return "text-red-500";
    return "text-zinc-500";
  };

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{trendLabel}</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="text-3xl font-bold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}
