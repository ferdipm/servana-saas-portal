import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Shift = {
  id: string;
  startTime: string;
  endTime: string;
};

type DaySchedule = {
  enabled: boolean;
  shifts: Shift[];
};

type WeekSchedule = {
  [key: string]: DaySchedule;
};

type SpecialDay = {
  id: string;
  date: string;
  name: string;
  type: "closed" | "special_hours";
  hours?: string;
};

const DAYS_MAP: { [key: string]: number } = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const restaurantId = formData.get("restaurantId") as string;
    const openingHoursStr = formData.get("openingHours") as string;
    const specialDaysStr = formData.get("specialDays") as string;

    if (!restaurantId || !openingHoursStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const openingHours: WeekSchedule = JSON.parse(openingHoursStr);
    const specialDays: SpecialDay[] = specialDaysStr
      ? JSON.parse(specialDaysStr)
      : [];

    const supabase = await supabaseServer();

    // Obtener reservas futuras (desde hoy en adelante)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("id, datetime_utc, num_guests")
      .eq("restaurant_id", restaurantId)
      .gte("datetime_utc", today.toISOString())
      .order("datetime_utc", { ascending: true });

    if (error) {
      console.error("Error fetching reservations:", error);
      return NextResponse.json(
        { hasConflicts: false },
        { status: 200 }
      );
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json(
        { hasConflicts: false },
        { status: 200 }
      );
    }

    // Verificar conflictos
    const conflicts: string[] = [];

    for (const reservation of reservations) {
      const reservationDate = new Date(reservation.datetime_utc);
      const dayOfWeek = reservationDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      const dateStr = reservationDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // Buscar el nombre del día en español
      const dayName = Object.keys(DAYS_MAP).find(
        (key) => DAYS_MAP[key] === dayOfWeek
      );

      if (!dayName) continue;

      // Verificar si hay un día especial para esta fecha
      const specialDay = specialDays.find((sd) => sd.date === dateStr);

      if (specialDay) {
        if (specialDay.type === "closed") {
          conflicts.push(
            `${dateStr}: Reserva a las ${reservationDate.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })} pero el restaurante estará cerrado (${specialDay.name})`
          );
          continue;
        }

        if (specialDay.type === "special_hours" && specialDay.hours) {
          // Validar con horario especial
          const isOpen = isTimeInRange(
            reservationDate,
            specialDay.hours.split(",")
          );
          if (!isOpen) {
            conflicts.push(
              `${dateStr}: Reserva a las ${reservationDate.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })} fuera del horario especial (${specialDay.name}: ${specialDay.hours})`
            );
          }
          continue;
        }
      }

      // Verificar con horario regular
      const daySchedule = openingHours[dayName];

      if (!daySchedule || !daySchedule.enabled || daySchedule.shifts.length === 0) {
        conflicts.push(
          `${dateStr} (${dayName}): Reserva a las ${reservationDate.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })} pero el restaurante estará cerrado`
        );
        continue;
      }

      // Verificar si la hora de la reserva cae en algún turno
      const reservationTime = `${reservationDate.getHours().toString().padStart(2, "0")}:${reservationDate.getMinutes().toString().padStart(2, "0")}`;
      const isInAnyShift = daySchedule.shifts.some((shift) => {
        return isTimeBetween(reservationTime, shift.startTime, shift.endTime);
      });

      if (!isInAnyShift) {
        const shiftsText = daySchedule.shifts
          .map((s) => `${s.startTime}-${s.endTime}`)
          .join(", ");
        conflicts.push(
          `${dateStr} (${dayName}): Reserva a las ${reservationTime} fuera de horarios (${shiftsText})`
        );
      }
    }

    if (conflicts.length > 0) {
      const message = `Se encontraron ${conflicts.length} reserva(s) que entrarían en conflicto:\n\n${conflicts.slice(0, 5).join("\n")}${
        conflicts.length > 5 ? `\n... y ${conflicts.length - 5} más` : ""
      }`;

      return NextResponse.json({
        hasConflicts: true,
        conflicts,
        message,
      });
    }

    return NextResponse.json({
      hasConflicts: false,
    });
  } catch (error) {
    console.error("Error in validate-hours:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: verificar si un tiempo está en rangos (formato "HH:MM-HH:MM,HH:MM-HH:MM")
function isTimeInRange(date: Date, ranges: string[]): boolean {
  const time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  for (const range of ranges) {
    const [start, end] = range.split("-");
    if (start && end && isTimeBetween(time, start.trim(), end.trim())) {
      return true;
    }
  }

  return false;
}

// Helper: verificar si time está entre start y end
function isTimeBetween(time: string, start: string, end: string): boolean {
  const timeMinutes = timeToMinutes(time);
  let startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);

  // Manejar turnos que cruzan medianoche (ej: 23:00-02:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    // Si el time es pequeño (ej: 01:00), también sumamos 24h
    if (timeMinutes < startMinutes) {
      return timeMinutes + 24 * 60 >= startMinutes && timeMinutes + 24 * 60 <= endMinutes;
    }
  }

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
