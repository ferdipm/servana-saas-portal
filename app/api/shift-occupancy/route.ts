import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ShiftConfig = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCovers?: number;
  maxPartySize?: number;
};

/**
 * GET /api/shift-occupancy?restaurantId=xxx&datetimeUtc=xxx
 * Returns the current occupancy for the shift that contains the given datetime
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const datetimeUtc = searchParams.get("datetimeUtc");
    // Optional local time params for accurate shift matching
    const localTime = searchParams.get("localTime"); // HH:mm format
    const localDate = searchParams.get("localDate"); // YYYY-MM-DD format

    if (!restaurantId || !datetimeUtc) {
      return NextResponse.json(
        { error: "Missing restaurantId or datetimeUtc parameter" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Get restaurant info with shifts and total_capacity
    const { data: restaurant, error: restError } = await supabase
      .from("restaurant_info")
      .select("opening_hours, total_capacity")
      .eq("id", restaurantId)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const openingHours = restaurant.opening_hours as Record<string, { shifts?: ShiftConfig[] }> | null;
    const totalCapacity = restaurant.total_capacity || 50;

    // Parse the datetime to get day name and time
    const datetime = new Date(datetimeUtc);
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Use local time if provided, otherwise fall back to UTC (which may be incorrect for shift matching)
    let hours: number;
    let minutes: number;
    let dayName: string;

    if (localTime && localDate) {
      // Parse local time directly - this is the correct approach
      const [localHours, localMinutes] = localTime.split(":").map(Number);
      hours = localHours;
      minutes = localMinutes;
      // Get day name from local date
      const localDateObj = new Date(localDate + "T12:00:00"); // Use noon to avoid timezone edge cases
      dayName = dayNames[localDateObj.getDay()];
    } else {
      // Fallback: use UTC time (may be incorrect for shift matching)
      dayName = dayNames[datetime.getUTCDay()];
      hours = datetime.getUTCHours();
      minutes = datetime.getUTCMinutes();
    }

    const timeDecimal = hours + minutes / 60;

    // Find the matching shift
    let matchingShift: ShiftConfig | null = null;
    const dayConfig = openingHours?.[dayName];

    if (dayConfig?.shifts) {
      for (const shift of dayConfig.shifts) {
        const [startH, startM] = shift.startTime.split(":").map(Number);
        const [endH, endM] = shift.endTime.split(":").map(Number);
        const startDecimal = startH + (startM || 0) / 60;
        const endDecimal = endH + (endM || 0) / 60;

        if (timeDecimal >= startDecimal && timeDecimal < endDecimal) {
          matchingShift = shift;
          break;
        }
      }
    }

    if (!matchingShift) {
      return NextResponse.json({
        found: false,
        message: "No shift found for this datetime",
        totalCapacity,
      });
    }

    // Calculate shift time range for counting reservations
    // IMPORTANT: The shift times (startTime, endTime) are in LOCAL time (restaurant's timezone)
    // Reservations are stored in UTC, so we need to calculate the correct UTC range
    const [startH, startM] = matchingShift.startTime.split(":").map(Number);
    const [endH, endM] = matchingShift.endTime.split(":").map(Number);

    let shiftStart: Date;
    let shiftEnd: Date;

    if (localDate && localTime) {
      // We can calculate the timezone offset from the provided local time vs UTC time
      // localTime is the local hour:minute, datetimeUtc is the UTC representation of the same moment
      const [localH, localM] = localTime.split(":").map(Number);
      const utcH = datetime.getUTCHours();
      const utcM = datetime.getUTCMinutes();

      // Calculate offset in minutes (local - UTC)
      // E.g., if local is 20:00 and UTC is 19:00, offset is +60 minutes
      let offsetMinutes = (localH * 60 + localM) - (utcH * 60 + utcM);

      // Handle day boundary (e.g., local is 01:00 and UTC is 23:00 previous day)
      if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;
      if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;

      // Parse the local date
      const [year, month, dayNum] = localDate.split("-").map(Number);

      // Create shift times in local timezone, then convert to UTC by subtracting the offset
      // shiftStart local = year-month-day at startH:startM in local time
      // shiftStart UTC = local time - offset
      const shiftStartLocal = new Date(Date.UTC(year, month - 1, dayNum, startH, startM || 0, 0, 0));
      const shiftEndLocal = new Date(Date.UTC(year, month - 1, dayNum, endH, endM || 0, 0, 0));

      // Adjust from local to UTC by subtracting the offset
      shiftStart = new Date(shiftStartLocal.getTime() - offsetMinutes * 60 * 1000);
      shiftEnd = new Date(shiftEndLocal.getTime() - offsetMinutes * 60 * 1000);
    } else {
      // Fallback: use UTC date components (less accurate but backwards compatible)
      const year = datetime.getUTCFullYear();
      const month = datetime.getUTCMonth();
      const day = datetime.getUTCDate();
      shiftStart = new Date(Date.UTC(year, month, day, startH, startM || 0, 0, 0));
      shiftEnd = new Date(Date.UTC(year, month, day, endH, endM || 0, 0, 0));
    }

    // Count current reservations in this shift (confirmed, reconfirmed, arrived, seated)
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select("party_size")
      .eq("restaurant_id", restaurantId)
      .gte("datetime_utc", shiftStart.toISOString())
      .lt("datetime_utc", shiftEnd.toISOString())
      .in("status", ["confirmed", "reconfirmed", "arrived", "seated", "pending"]);

    if (resError) {
      console.error("[shift-occupancy] Error fetching reservations:", resError);
      return NextResponse.json(
        { error: "Error fetching reservations" },
        { status: 500 }
      );
    }

    const currentCovers = reservations?.reduce((sum, r) => sum + (r.party_size || 0), 0) || 0;
    const maxCovers = matchingShift.maxCovers || totalCapacity;
    const availableSpots = Math.max(0, totalCapacity - currentCovers);
    const botAvailableSpots = Math.max(0, maxCovers - currentCovers);
    const utilizationPercent = Math.round((currentCovers / totalCapacity) * 100);

    return NextResponse.json({
      found: true,
      shift: {
        name: matchingShift.name,
        startTime: matchingShift.startTime,
        endTime: matchingShift.endTime,
      },
      occupancy: {
        currentCovers,
        totalCapacity,
        botMaxCovers: maxCovers,
        availableSpots,
        botAvailableSpots,
        utilizationPercent,
      },
    });
  } catch (error) {
    console.error("[shift-occupancy] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
