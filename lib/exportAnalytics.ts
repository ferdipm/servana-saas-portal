import { format } from "date-fns";
import { es } from "date-fns/locale";

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

function escapeCSV(value: string | number): string {
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function exportAnalyticsToCSV(data: AnalyticsData, period: string): void {
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  const filename = `analytics_${period}_${timestamp}.csv`;

  // Crear el contenido CSV con múltiples secciones
  const csvSections: string[] = [];

  // 1. Resumen General
  csvSections.push("RESUMEN GENERAL");
  csvSections.push("Métrica,Valor,Tendencia %");
  csvSections.push(`Total Reservas,${data.totalReservations},${data.trends.reservations > 0 ? '+' : ''}${data.trends.reservations.toFixed(1)}%`);
  csvSections.push(`Total Comensales,${data.totalGuests},${data.trends.guests > 0 ? '+' : ''}${data.trends.guests.toFixed(1)}%`);
  csvSections.push(`Promedio Personas,${data.avgPartySize.toFixed(1)},${data.trends.avgPartySize > 0 ? '+' : ''}${data.trends.avgPartySize.toFixed(1)}%`);
  csvSections.push(`Tasa de Ocupación,${data.occupancyRate.toFixed(1)}%,${data.trends.occupancyRate > 0 ? '+' : ''}${data.trends.occupancyRate.toFixed(1)}%`);
  csvSections.push("");

  // 2. Tendencias por Día
  csvSections.push("TENDENCIAS POR DÍA");
  csvSections.push("Fecha,Reservas,Comensales");
  data.reservationsByDay.forEach(day => {
    const formattedDate = format(new Date(day.date), "dd/MM/yyyy", { locale: es });
    csvSections.push(`${formattedDate},${day.count},${day.guests}`);
  });
  csvSections.push("");

  // 3. Distribución por Horario
  csvSections.push("DISTRIBUCIÓN POR HORARIO");
  csvSections.push("Hora,Reservas,Comensales");
  data.reservationsByTime.forEach(time => {
    csvSections.push(`${time.hour}:00,${time.count},${time.guests}`);
  });
  csvSections.push("");

  // 4. Ocupación por Turno
  csvSections.push("OCUPACIÓN POR TURNO");
  csvSections.push("Turno,Comensales Promedio,Capacidad Total,% Ocupación,Plazas Disponibles");
  data.reservationsByTurn.forEach(turn => {
    const occupancy = ((turn.guests / turn.capacity) * 100).toFixed(1);
    const available = turn.capacity - turn.guests;
    csvSections.push(`${turn.turn},${turn.guests},${turn.capacity},${occupancy}%,${available}`);
  });
  csvSections.push("");

  // 5. Fuentes de Reservas
  csvSections.push("FUENTES DE RESERVAS");
  csvSections.push("Fuente,Cantidad,Porcentaje");
  data.reservationsBySources.forEach(source => {
    csvSections.push(`${escapeCSV(source.source)},${source.count},${source.percentage.toFixed(1)}%`);
  });
  csvSections.push("");

  // 6. Ocupación en Tiempo Real (Hoy)
  csvSections.push("OCUPACIÓN TIEMPO REAL (HOY)");
  csvSections.push("Turno,Comensales Actuales,Capacidad Máxima,% Ocupación,Plazas Disponibles");
  data.realTimeOccupancy.forEach(occ => {
    const available = occ.maxCapacity - occ.currentGuests;
    csvSections.push(`${occ.turn},${occ.currentGuests},${occ.maxCapacity},${occ.percentage.toFixed(1)}%,${available}`);
  });

  // Unir todas las secciones
  const csvContent = csvSections.join("\n");

  // Crear el Blob y descargar
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
