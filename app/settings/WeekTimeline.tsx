"use client";

type Shift = {
  id: string;
  startTime: string;
  endTime: string;
  name: string;
  emoji: string;
  color?: string; // Color personalizado (hex)
  isCustom?: boolean; // Si es un turno personalizado
};

type DaySchedule = {
  enabled: boolean;
  openTime?: string;  // Hora apertura del establecimiento
  closeTime?: string; // Hora cierre del establecimiento
  shifts: Shift[];
};

type WeekSchedule = {
  [key: string]: DaySchedule;
};

type SpecialDay = {
  id: string;
  date: string;
  name: string;
  type: "closed" | "special_hours" | "event";
  hours?: string;
  shifts?: Shift[];
};

type WeekTimelineProps = {
  schedule: WeekSchedule;
  specialDays?: SpecialDay[];
};

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Timeline de 6:00 AM a 6:00 AM del día siguiente (24 horas)
const TIMELINE_START_HOUR = 6; // 6:00 AM
const TIMELINE_HOURS = 24;

export function WeekTimeline({ schedule, specialDays = [] }: WeekTimelineProps) {
  const DAYS = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  // Convertir hora "HH:MM" a minutos desde el inicio del timeline (6:00 AM)
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;

    // Si la hora es menor que TIMELINE_START_HOUR, es del día siguiente
    if (hours < TIMELINE_START_HOUR) {
      totalMinutes += 24 * 60;
    }

    // Restar el offset del inicio del timeline
    return totalMinutes - (TIMELINE_START_HOUR * 60);
  };

  // Obtener días especiales para los próximos 7 días
  const getUpcomingSpecialDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date;
    });

    return next7Days.map((date, dayIndex) => {
      // Usar fecha local en lugar de UTC para evitar offset de timezone
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const specialDay = specialDays.find(sd => sd.date === dateStr);
      return {
        dayName: DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1], // Ajustar para que Lunes sea 0
        specialDay,
        date: dateStr,
      };
    });
  };

  const upcomingSpecialDays = getUpcomingSpecialDays();

  // Calcular posición y ancho de un turno en el timeline (0-100%)
  const getShiftPosition = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const totalTimelineMinutes = TIMELINE_HOURS * 60;
    const left = (startMinutes / totalTimelineMinutes) * 100;
    const width = ((endMinutes - startMinutes) / totalTimelineMinutes) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  // Verificar si dos franjas horarias se solapan
  const checkOverlap = (shift: Shift, eventHours: string): boolean => {
    if (!eventHours) return false;

    const [eventStart, eventEnd] = eventHours.split('-');
    if (!eventStart || !eventEnd) return false;

    const shiftStart = timeToMinutes(shift.startTime);
    const shiftEnd = timeToMinutes(shift.endTime);
    const evStart = timeToMinutes(eventStart);
    const evEnd = timeToMinutes(eventEnd);

    // Verificar solapamiento
    return !(shiftEnd <= evStart || shiftStart >= evEnd);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200">Vista semanal</h3>

      {/* Timeline grid */}
      <div className="relative pt-6">
        {/* Marcadores de hora */}
        <div className="absolute top-0 left-0 right-0 text-[10px] text-zinc-500 font-medium">
          <div className="relative ml-12 mr-0">
            {[0, 6, 12, 18, 24].map((offsetHour) => {
              const actualHour = (TIMELINE_START_HOUR + offsetHour) % 24;
              const isFirst = offsetHour === 0;
              const isLast = offsetHour === 24;

              return (
                <div
                  key={offsetHour}
                  className="absolute"
                  style={{
                    left: `calc(${(offsetHour / TIMELINE_HOURS) * 100}%)`,
                    transform: isLast ? 'translateX(-100%)' : 'none'
                  }}
                >
                  {actualHour.toString().padStart(2, "0")}:00
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid de días */}
        <div className="space-y-1">
          {DAYS.map((day, dayIndex) => {
            const daySchedule = schedule[day];
            const isOpen = daySchedule?.enabled && daySchedule.shifts.length > 0;

            // Buscar si hay un día especial para este día de la semana en los próximos 7 días
            const specialDayForThisDay = upcomingSpecialDays.find(sd => sd.dayName === day && sd.specialDay);
            const hasSpecialDay = !!specialDayForThisDay?.specialDay;
            const specialDay = specialDayForThisDay?.specialDay;

            return (
              <div key={day} className="flex items-center gap-2">
                {/* Nombre del día */}
                <div className="w-12 text-xs text-zinc-400 font-medium">
                  {DAYS_SHORT[dayIndex]}
                  {hasSpecialDay && <div className="text-[8px] text-rose-400">●</div>}
                </div>

                {/* Timeline del día */}
                <div className="flex-1 relative h-6 bg-zinc-900/60 rounded border border-zinc-800">
                  {/* Grid de fondo (cada 6 horas) */}
                  {[0.25, 0.5, 0.75].map((position) => (
                    <div
                      key={position}
                      className="absolute top-0 bottom-0 w-px bg-zinc-800/50"
                      style={{ left: `${position * 100}%` }}
                    />
                  ))}

                  {/* Franja de horario del establecimiento (fondo sutil) */}
                  {isOpen && daySchedule.openTime && daySchedule.closeTime && (
                    (() => {
                      const position = getShiftPosition(daySchedule.openTime, daySchedule.closeTime);
                      return (
                        <div
                          className="absolute top-0 bottom-0 bg-cyan-500/10 border-l border-r border-cyan-500/20"
                          style={{
                            left: position.left,
                            width: position.width,
                          }}
                          title={`Establecimiento abierto: ${daySchedule.openTime} - ${daySchedule.closeTime}`}
                        />
                      );
                    })()
                  )}

                  {/* Turnos del día */}
                  {isOpen && (
                    <>
                      {/* Mostrar turnos según el tipo de día especial */}
                      {(!hasSpecialDay || specialDay?.type === "event" || specialDay?.type === "special_hours") &&
                        (() => {
                          // Si hay horario especial con turnos personalizados, usar esos
                          if (specialDay?.type === "special_hours" && specialDay.shifts && specialDay.shifts.length > 0) {
                            return specialDay.shifts;
                          }

                          // Si no, usar turnos regulares filtrados
                          return daySchedule.shifts.filter(shift => {
                            // Si es EVENTO: filtrar turnos que se solapen con el evento
                            if (specialDay?.type === "event" && specialDay.hours) {
                              return !checkOverlap(shift, specialDay.hours);
                            }
                            // Si es HORARIO ESPECIAL: mostrar SOLO turnos que se solapen con el horario especial
                            if (specialDay?.type === "special_hours" && specialDay.hours) {
                              return checkOverlap(shift, specialDay.hours);
                            }
                            return true;
                          });
                        })()
                          .map((shift, shiftIndex) => {
                            const position = getShiftPosition(
                              shift.startTime,
                              shift.endTime
                            );

                            // Si el turno tiene color personalizado, usarlo
                            if (shift.color) {
                              return (
                                <div
                                  key={shiftIndex}
                                  className="absolute top-0.5 bottom-0.5 border rounded-sm flex items-center justify-center text-[9px] text-white font-medium overflow-hidden backdrop-blur-[1px]"
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    backgroundColor: `${shift.color}66`, // 66 = 40% opacity para look ultra sleek
                                    borderColor: `${shift.color}99`, // 99 = 60% opacity para el borde
                                  }}
                                  title={`${shift.emoji} ${shift.name}: ${shift.startTime}-${shift.endTime}`}
                                >
                                  <span className="truncate px-1">
                                    {shift.emoji}
                                  </span>
                                </div>
                              );
                            }

                            // Si no tiene color personalizado, usar colores de plantilla
                            const colors = {
                              Desayuno: "bg-amber-500/40 border-amber-400/60",
                              Comida: "bg-emerald-500/40 border-emerald-400/60",
                              Cena: "bg-indigo-500/40 border-indigo-400/60",
                            };

                            const colorClass =
                              colors[shift.name as keyof typeof colors] ||
                              "bg-zinc-500/40 border-zinc-400/60";

                            return (
                              <div
                                key={shiftIndex}
                                className={`absolute top-0.5 bottom-0.5 ${colorClass} border rounded-sm flex items-center justify-center text-[9px] text-white font-medium overflow-hidden backdrop-blur-[1px]`}
                                style={{
                                  left: position.left,
                                  width: position.width,
                                }}
                                title={`${shift.emoji} ${shift.name}: ${shift.startTime}-${shift.endTime}`}
                              >
                                <span className="truncate px-1">
                                  {shift.emoji}
                                </span>
                              </div>
                            );
                          })
                      }
                    </>
                  )}

                  {/* Indicador de cerrado o día especial */}
                  {!isOpen && !hasSpecialDay && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-zinc-600 italic">
                        Cerrado
                      </span>
                    </div>
                  )}

                  {/* Indicador de CERRADO (overlay completo con glassmorphism) */}
                  {hasSpecialDay && specialDay && specialDay.type === "closed" && (
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-rose-600/15 to-rose-700/10 backdrop-blur-[2px] rounded flex items-center justify-center animate-in fade-in duration-300">
                      <div className="flex items-center gap-1.5 bg-rose-950/80 backdrop-blur-sm border border-rose-500/40 rounded-md px-3 py-1 shadow-lg">
                        <span className="text-[10px] text-rose-200 font-semibold tracking-wide">
                          🔴 {specialDay.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Indicador de HORARIO ESPECIAL (marco amarillo sutil + tooltip) */}
                  {hasSpecialDay && specialDay && specialDay.type === "special_hours" && specialDay.hours && (
                    (() => {
                      const position = getShiftPosition(
                        specialDay.hours.split('-')[0],
                        specialDay.hours.split('-')[1]
                      );

                      // Crear tooltip descriptivo
                      const tooltipText = specialDay.shifts && specialDay.shifts.length > 0
                        ? `⚠️ ${specialDay.name} - Turnos especiales: ${specialDay.shifts.map(s => `${s.emoji} ${s.startTime}-${s.endTime}`).join(', ')}`
                        : `⚠️ Horario especial: ${specialDay.name} (${specialDay.hours})`;

                      return (
                        <>
                          {/* Overlay de fondo con patrón de franjas muy sutil */}
                          <div
                            className="absolute inset-0 rounded pointer-events-none"
                            style={{
                              backgroundImage: `repeating-linear-gradient(
                                45deg,
                                rgba(251, 191, 36, 0.02),
                                rgba(251, 191, 36, 0.02) 10px,
                                transparent 10px,
                                transparent 20px
                              )`
                            }}
                          />

                          {/* Marco amarillo sutil y animado CON tooltip funcional */}
                          <div
                            className="absolute top-0.5 bottom-0.5 border-2 border-amber-500/50 rounded-sm animate-pulse-slow cursor-help"
                            style={{
                              left: position.left,
                              width: position.width,
                              boxShadow: '0 0 6px rgba(251, 191, 36, 0.2)',
                            }}
                            title={tooltipText}
                          />
                        </>
                      );
                    })()
                  )}

                  {/* Badge de evento privado (en la franja específica) */}
                  {hasSpecialDay && specialDay?.type === "event" && specialDay.hours && (
                    (() => {
                      const position = getShiftPosition(
                        specialDay.hours.split('-')[0],
                        specialDay.hours.split('-')[1]
                      );
                      return (
                        <div
                          className="absolute top-0.5 bottom-0.5 bg-purple-900/60 border border-purple-600/40 rounded-sm flex items-center justify-center"
                          style={{
                            left: position.left,
                            width: position.width,
                          }}
                          title={`Evento privado: ${specialDay.name} (${specialDay.hours})`}
                        >
                          <span className="text-[9px] text-purple-300 font-medium truncate px-1">
                            🎉 {specialDay.name}
                          </span>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 mt-4 text-[10px] flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-cyan-500/20 border-l border-r border-cyan-500/40 rounded-sm"></div>
            <span className="text-zinc-400">🏪 Establecimiento abierto</span>
          </div>
          <div className="h-3 w-px bg-zinc-700"></div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500/80 border border-amber-400 rounded-sm"></div>
            <span className="text-zinc-400">☕ Desayuno</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500/80 border border-emerald-400 rounded-sm"></div>
            <span className="text-zinc-400">🍽️ Comida</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-indigo-500/80 border border-indigo-400 rounded-sm"></div>
            <span className="text-zinc-400">🌙 Cena</span>
          </div>
          <div className="h-3 w-px bg-zinc-700"></div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-rose-900/60 border border-rose-600/40 rounded-sm"></div>
            <span className="text-zinc-400">🔴 Cerrado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-900/60 border border-amber-600/40 rounded-sm"></div>
            <span className="text-zinc-400">⚠️ Horario especial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-900/60 border border-purple-600/40 rounded-sm"></div>
            <span className="text-zinc-400">🎉 Evento privado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
