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
    const dayName = dayNames[datetime.getDay()];
    const hours = datetime.getHours();
    const minutes = datetime.getMinutes();
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
    const dateStr = datetime.toISOString().split("T")[0];
    const [startH, startM] = matchingShift.startTime.split(":").map(Number);
    const [endH, endM] = matchingShift.endTime.split(":").map(Number);

    const shiftStart = new Date(`${dateStr}T${String(startH).padStart(2, "0")}:${String(startM || 0).padStart(2, "0")}:00Z`);
    const shiftEnd = new Date(`${dateStr}T${String(endH).padStart(2, "0")}:${String(endM || 0).padStart(2, "0")}:00Z`);

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
