import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const period = searchParams.get("period") || "7d";

    console.log("[Analytics API] Request received:", { restaurantId, period });

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Missing restaurantId parameter" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Calculate date range based on period using Spain timezone (Europe/Madrid)
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Convertir a zona horaria de España
    const spainTimeString = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
    const spainTime = new Date(spainTimeString);
    const spainOffset = -spainTime.getTimezoneOffset() / 60; // Offset en horas

    // Helper para crear inicio del día en Spain timezone, pero en UTC
    const startOfDaySpain = (date: Date) => {
      const result = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0, 0, 0, 0
      ));
      result.setUTCHours(result.getUTCHours() - spainOffset);
      return result;
    };

    const endOfDaySpain = (date: Date) => {
      const result = startOfDaySpain(date);
      result.setUTCDate(result.getUTCDate() + 1);
      result.setUTCMilliseconds(result.getUTCMilliseconds() - 1);
      return result;
    };

    const subDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() - days);
      return result;
    };

    const startOfWeekSpain = (date: Date) => {
      const result = new Date(date);
      const day = result.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday = 1
      result.setDate(result.getDate() + diff);
      return startOfDaySpain(result);
    };

    const startOfMonthSpain = (date: Date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      return startOfDaySpain(firstDay);
    };

    endDate = endOfDaySpain(spainTime);

    switch (period) {
      case "today":
        startDate = startOfDaySpain(spainTime);
        break;
      case "yesterday":
        const yesterday = subDays(spainTime, 1);
        startDate = startOfDaySpain(yesterday);
        endDate = endOfDaySpain(yesterday);
        break;
      case "this_week":
        startDate = startOfWeekSpain(spainTime);
        break;
      case "this_month":
        startDate = startOfMonthSpain(spainTime);
        break;
      case "7d":
        startDate = startOfDaySpain(subDays(spainTime, 7));
        break;
      case "30d":
        startDate = startOfDaySpain(subDays(spainTime, 30));
        break;
      case "90d":
        startDate = startOfDaySpain(subDays(spainTime, 90));
        break;
      default:
        startDate = startOfDaySpain(subDays(spainTime, 7));
    }

    // Calculate previous period dates for trend comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = startOfDaySpain(subDays(spainTime, periodDays * 2));
    const prevEndDate = endOfDaySpain(subDays(spainTime, periodDays));

    // Fetch all data in parallel for better performance
    console.log(`[Analytics API] Fetching data in parallel for restaurant ${restaurantId}, period: ${period}`);
    console.log(`[Analytics API] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const [
      { data: reservations, error: reservationsError },
      { data: prevReservations },
      { data: restaurantInfo }
    ] = await Promise.all([
      // Current period reservations
      supabase
        .from("reservations")
        .select("id, datetime_utc, party_size, source, status")
        .eq("restaurant_id", restaurantId)
        .gte("datetime_utc", startDate.toISOString())
        .lte("datetime_utc", endDate.toISOString())
        .neq("status", "cancelled")
        .order("datetime_utc", { ascending: true }),

      // Previous period reservations for trend comparison
      supabase
        .from("reservations")
        .select("id, party_size")
        .eq("restaurant_id", restaurantId)
        .gte("datetime_utc", prevStartDate.toISOString())
        .lte("datetime_utc", prevEndDate.toISOString())
        .neq("status", "cancelled"),

      // Restaurant info for capacity/opening hours
      supabase
        .from("restaurant_info")
        .select("opening_hours")
        .eq("id", restaurantId)
        .single()
    ]);

    if (reservationsError) {
      console.error("[Analytics API] Error fetching reservations:", reservationsError);
      return NextResponse.json(
        { error: "Error fetching reservations" },
        { status: 500 }
      );
    }

    console.log(`[Analytics API] Found ${reservations?.length || 0} reservations`);

    if (!reservations || reservations.length === 0) {
      console.log("[Analytics API] No reservations found, returning empty analytics");
      return NextResponse.json(getEmptyAnalytics());
    }

    // Calculate KPIs
    const totalReservations = reservations.length;
    const totalGuests = reservations.reduce((sum, r) => sum + (r.party_size || 0), 0);
    const avgPartySize = totalReservations > 0 ? totalGuests / totalReservations : 0;

    const prevTotalReservations = prevReservations?.length || 0;
    const prevTotalGuests = prevReservations?.reduce((sum, r) => sum + (r.party_size || 0), 0) || 0;
    const prevAvgPartySize = prevTotalReservations > 0 ? prevTotalGuests / prevTotalReservations : 0;

    // Calculate trends (percentage change)
    const reservationsTrend = prevTotalReservations > 0
      ? ((totalReservations - prevTotalReservations) / prevTotalReservations) * 100
      : 0;
    const guestsTrend = prevTotalGuests > 0
      ? ((totalGuests - prevTotalGuests) / prevTotalGuests) * 100
      : 0;
    const avgPartySizeTrend = prevAvgPartySize > 0
      ? ((avgPartySize - prevAvgPartySize) / prevAvgPartySize) * 100
      : 0;

    // Calculate occupancy rate (requires capacity info from opening_hours)
    let occupancyRate = 0;
    let occupancyTrend = 0;

    // Group reservations by day
    const reservationsByDay = groupReservationsByDay(reservations, startDate, endDate);

    // Group by time (hour)
    const reservationsByTime = groupReservationsByTime(reservations);

    // Group by turn
    const reservationsByTurn = await groupReservationsByTurn(
      reservations,
      restaurantInfo?.opening_hours || {},
      periodDays
    );

    // Calculate occupancy rate based on turns (average daily occupancy)
    if (reservationsByTurn.length > 0) {
      const dailyCapacity = reservationsByTurn.reduce((sum, t) => sum + t.capacity, 0);
      const totalGuests = reservationsByTurn.reduce((sum, t) => sum + t.guests, 0);
      const numDays = periodDays > 0 ? periodDays : 1;
      const avgDailyGuests = totalGuests / numDays;
      occupancyRate = dailyCapacity > 0 ? (avgDailyGuests / dailyCapacity) * 100 : 0;
    }

    // Group by source
    const reservationsBySources = groupReservationsBySource(reservations);

    // Real-time occupancy (today's reservations by turn)
    const realTimeOccupancy = await getRealTimeOccupancy(
      supabase,
      restaurantId,
      restaurantInfo?.opening_hours || {}
    );

    return NextResponse.json({
      totalReservations,
      totalGuests,
      avgPartySize,
      occupancyRate,
      trends: {
        reservations: reservationsTrend,
        guests: guestsTrend,
        avgPartySize: avgPartySizeTrend,
        occupancyRate: occupancyTrend,
      },
      reservationsByDay,
      reservationsByTime,
      reservationsByTurn,
      reservationsBySources,
      realTimeOccupancy,
    });
  } catch (error) {
    console.error("[Analytics API] Fatal error:", error);
    console.error("[Analytics API] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("[Analytics API] Error message:", error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

function getEmptyAnalytics() {
  return {
    totalReservations: 0,
    totalGuests: 0,
    avgPartySize: 0,
    occupancyRate: 0,
    trends: {
      reservations: 0,
      guests: 0,
      avgPartySize: 0,
      occupancyRate: 0,
    },
    reservationsByDay: [],
    reservationsByTime: [],
    reservationsByTurn: [],
    reservationsBySources: [],
    realTimeOccupancy: [],
  };
}

function groupReservationsByDay(
  reservations: any[],
  startDate: Date,
  endDate: Date
) {
  const dayMap = new Map<string, { count: number; guests: number }>();

  // Initialize all days in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    dayMap.set(dateStr, { count: 0, guests: 0 });
    current.setDate(current.getDate() + 1);
  }

  // Fill with actual data
  reservations.forEach((r) => {
    const dateStr = r.datetime_utc.split("T")[0];
    const existing = dayMap.get(dateStr) || { count: 0, guests: 0 };
    dayMap.set(dateStr, {
      count: existing.count + 1,
      guests: existing.guests + (r.party_size || 0),
    });
  });

  return Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    guests: data.guests,
  }));
}

function groupReservationsByTime(reservations: any[]) {
  const timeMap = new Map<number, { count: number; guests: number }>();

  // Initialize all hours (0-23)
  for (let i = 0; i < 24; i++) {
    timeMap.set(i, { count: 0, guests: 0 });
  }

  reservations.forEach((r) => {
    const date = new Date(r.datetime_utc);
    const hour = date.getUTCHours();
    const existing = timeMap.get(hour) || { count: 0, guests: 0 };
    timeMap.set(hour, {
      count: existing.count + 1,
      guests: existing.guests + (r.party_size || 0),
    });
  });

  return Array.from(timeMap.entries())
    .map(([hour, data]) => ({
      hour,
      count: data.count,
      guests: data.guests,
    }))
    .filter((item) => item.count > 0); // Only show hours with reservations
}

async function groupReservationsByTurn(
  reservations: any[],
  openingHours: any,
  periodDays: number
) {
  const turnMap = new Map<string, { count: number; guests: number; capacity: number; daysActive: number }>();

  // Extract turns from opening hours
  const turns = extractTurnsFromOpeningHours(openingHours);

  // Calculate how many days per week each turn is active
  const turnDaysActive = calculateTurnDaysActive(openingHours, turns);

  // Initialize turns
  turns.forEach((turn) => {
    const daysActive = turnDaysActive.get(turn.name) || 7; // Default to 7 if not found
    turnMap.set(turn.name, {
      count: 0,
      guests: 0,
      capacity: turn.capacity || 50,
      daysActive
    });
  });

  // Assign reservations to turns
  reservations.forEach((r) => {
    const date = new Date(r.datetime_utc);
    const hour = date.getUTCHours();
    const turn = findTurnForHour(hour, turns);

    if (turn) {
      const existing = turnMap.get(turn.name) || { count: 0, guests: 0, capacity: turn.capacity || 50, daysActive: 7 };
      turnMap.set(turn.name, {
        count: existing.count + 1,
        guests: existing.guests + (r.party_size || 0),
        capacity: existing.capacity,
        daysActive: existing.daysActive,
      });
    }
  });

  // Calculate daily averages
  const numDays = periodDays > 0 ? periodDays : 1;

  return Array.from(turnMap.entries()).map(([turn, data]) => ({
    turn,
    count: Math.round(data.count / numDays), // Average reservations per day
    guests: Math.round(data.guests / numDays), // Average guests per day
    capacity: data.capacity, // Daily capacity (already accounts for one service per day)
  }));
}

function calculateTurnDaysActive(openingHours: any, turns: any[]): Map<string, number> {
  const daysActiveMap = new Map<string, number>();

  if (!openingHours || typeof openingHours !== 'object') {
    // If no opening hours, assume all turns are active every day
    turns.forEach(turn => daysActiveMap.set(turn.name, 7));
    return daysActiveMap;
  }

  // Initialize counters for each turn
  turns.forEach(turn => daysActiveMap.set(turn.name, 0));

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  days.forEach(day => {
    const daySchedule = openingHours[day];

    if (!daySchedule?.enabled || !Array.isArray(daySchedule.shifts)) {
      return;
    }

    // For each shift in this day, increment the counter for that turn
    daySchedule.shifts.forEach((shift: any) => {
      if (shift.name && daysActiveMap.has(shift.name)) {
        daysActiveMap.set(shift.name, (daysActiveMap.get(shift.name) || 0) + 1);
      }
    });
  });

  // If any turn has 0 days active, default to 7
  daysActiveMap.forEach((count, turnName) => {
    if (count === 0) {
      daysActiveMap.set(turnName, 7);
    }
  });

  return daysActiveMap;
}

function groupReservationsBySource(reservations: any[]) {
  const sourceMap = new Map<string, number>();

  reservations.forEach((r) => {
    let source = r.source || "Other";
    // Translate "Phone" to "Teléfono" for Spanish display
    if (source === "Phone") source = "Teléfono";
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const total = reservations.length;
  if (total === 0) {
    return Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: 0,
    }));
  }

  // Use "largest remainder" method to ensure percentages sum to exactly 100%
  const entries = Array.from(sourceMap.entries()).map(([source, count]) => {
    const exactPercentage = (count / total) * 100;
    return {
      source,
      count,
      exactPercentage,
      floorPercentage: Math.floor(exactPercentage),
      remainder: exactPercentage - Math.floor(exactPercentage),
    };
  });

  // Calculate how many percentage points we need to distribute
  const floorSum = entries.reduce((sum, e) => sum + e.floorPercentage, 0);
  let remaining = 100 - floorSum;

  // Sort by remainder (descending) to distribute the extra points
  entries.sort((a, b) => b.remainder - a.remainder);

  // Distribute remaining points to items with largest remainders
  return entries.map((entry) => {
    let percentage = entry.floorPercentage;
    if (remaining > 0 && entry.remainder > 0) {
      percentage += 1;
      remaining -= 1;
    }
    return {
      source: entry.source,
      count: entry.count,
      percentage,
    };
  }).sort((a, b) => b.count - a.count); // Sort by count for display
}

async function getRealTimeOccupancy(
  supabase: any,
  restaurantId: string,
  openingHours: any
) {
  const now = new Date();

  // Calcular "hoy" basado en la zona horaria de España
  const spainTimeString = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const spainTime = new Date(spainTimeString);
  const spainOffset = -spainTime.getTimezoneOffset() / 60;

  const startOfToday = new Date(Date.UTC(
    spainTime.getFullYear(),
    spainTime.getMonth(),
    spainTime.getDate(),
    0, 0, 0, 0
  ));
  startOfToday.setUTCHours(startOfToday.getUTCHours() - spainOffset);

  const endOfToday = new Date(startOfToday);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
  endOfToday.setUTCMilliseconds(endOfToday.getUTCMilliseconds() - 1);

  const { data: todayReservations } = await supabase
    .from("reservations")
    .select("id, datetime_utc, party_size, status")
    .eq("restaurant_id", restaurantId)
    .gte("datetime_utc", startOfToday.toISOString())
    .lte("datetime_utc", endOfToday.toISOString())
    .neq("status", "cancelled");

  const turns = extractTurnsFromOpeningHours(openingHours);
  const turnOccupancy = new Map<string, {
    currentGuests: number;
    maxCapacity: number;
    statusBreakdown: {
      confirmed: number;
      pending: number;
      seated: number;
      finished: number;
      no_show: number;
    };
  }>();

  turns.forEach((turn) => {
    turnOccupancy.set(turn.name, {
      currentGuests: 0,
      maxCapacity: turn.capacity || 50,
      statusBreakdown: {
        confirmed: 0,
        pending: 0,
        seated: 0,
        finished: 0,
        no_show: 0,
      },
    });
  });

  todayReservations?.forEach((r: any) => {
    const date = new Date(r.datetime_utc);
    const hour = date.getUTCHours();
    const turn = findTurnForHour(hour, turns);

    if (turn) {
      const existing = turnOccupancy.get(turn.name) || {
        currentGuests: 0,
        maxCapacity: turn.capacity || 50,
        statusBreakdown: {
          confirmed: 0,
          pending: 0,
          seated: 0,
          finished: 0,
          no_show: 0,
        },
      };

      const partySize = r.party_size || 0;
      const status = r.status || 'confirmed';

      turnOccupancy.set(turn.name, {
        currentGuests: existing.currentGuests + partySize,
        maxCapacity: existing.maxCapacity,
        statusBreakdown: {
          ...existing.statusBreakdown,
          [status]: (existing.statusBreakdown[status as keyof typeof existing.statusBreakdown] || 0) + partySize,
        },
      });
    }
  });

  return Array.from(turnOccupancy.entries()).map(([turn, data]) => ({
    turn,
    currentGuests: data.currentGuests,
    maxCapacity: data.maxCapacity,
    percentage: data.maxCapacity > 0 ? (data.currentGuests / data.maxCapacity) * 100 : 0,
    statusBreakdown: data.statusBreakdown,
  }));
}

function extractTurnsFromOpeningHours(openingHours: any) {
  const turns: { name: string; startHour: number; endHour: number; capacity: number }[] = [];

  if (!openingHours || typeof openingHours !== 'object') {
    // Fallback to default turns if no opening hours configured
    return [
      { name: "Comida", startHour: 12, endHour: 16, capacity: 50 },
      { name: "Cena", startHour: 19, endHour: 23, capacity: 60 }
    ];
  }

  // Parse opening hours structure:
  // { "Lunes": { enabled: true, shifts: [...] }, ... }
  const uniqueShifts = new Map<string, { startHour: number; endHour: number; capacity: number; order: number }>();

  // Days of the week to scan
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  days.forEach(day => {
    const daySchedule = openingHours[day];

    if (!daySchedule?.enabled || !Array.isArray(daySchedule.shifts)) {
      return;
    }

    daySchedule.shifts.forEach((shift: any) => {
      if (!shift.name || !shift.startTime || !shift.endTime) {
        return;
      }

      // Parse times - format "HH:MM"
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);

      // Convert to decimal hours for easier comparison
      const startDecimal = startHour + (startMin || 0) / 60;
      const endDecimal = endHour + (endMin || 0) / 60;

      // Use shift name as unique key
      if (!uniqueShifts.has(shift.name)) {
        uniqueShifts.set(shift.name, {
          startHour: Math.floor(startDecimal),
          endHour: Math.ceil(endDecimal),
          capacity: shift.maxCovers || 50,
          order: startDecimal, // For sorting
        });
      }
    });
  });

  // Convert map to array and sort by start time
  const parsedTurns = Array.from(uniqueShifts.entries())
    .map(([name, data]) => ({
      name,
      startHour: data.startHour,
      endHour: data.endHour,
      capacity: data.capacity,
    }))
    .sort((a, b) => a.startHour - b.startHour);

  // If no shifts were parsed, return default turns
  if (parsedTurns.length === 0) {
    return [
      { name: "Comida", startHour: 12, endHour: 16, capacity: 50 },
      { name: "Cena", startHour: 19, endHour: 23, capacity: 60 }
    ];
  }

  return parsedTurns;
}

function findTurnForHour(
  hour: number,
  turns: { name: string; startHour: number; endHour: number; capacity: number }[]
) {
  return turns.find((turn) => hour >= turn.startHour && hour < turn.endHour);
}
