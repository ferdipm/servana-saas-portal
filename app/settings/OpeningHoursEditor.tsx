"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { updateOpeningHours } from "./actions";
import { WeekTimeline } from "./WeekTimeline";
import { SpecialDaysManager } from "./SpecialDaysManager";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Tipos para los turnos
type Shift = {
  id: string;
  name: string;
  emoji: string;
  startTime: string;
  endTime: string;
  color?: string; // Color personalizado (hex)
  isCustom?: boolean; // Si es un turno personalizado
};

type DaySchedule = {
  enabled: boolean;
  openTime?: string;  // Hora apertura del establecimiento (ej: "12:00")
  closeTime?: string; // Hora cierre del establecimiento (ej: "00:00")
  shifts: Shift[];    // Turnos de cocina/servicio
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

type OpeningHoursEditorProps = {
  restaurantId: string;
  initialHours: any;
  initialSpecialDays?: SpecialDay[];
  isReadOnly: boolean;
};

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const SHIFT_TEMPLATES = [
  { name: "Desayuno", emoji: "☕", defaultStart: "08:00", defaultEnd: "12:00", color: "#f59e0b" },
  { name: "Comida", emoji: "🍽️", defaultStart: "13:00", defaultEnd: "16:00", color: "#10b981" },
  { name: "Cena", emoji: "🌙", defaultStart: "20:00", defaultEnd: "23:30", color: "#6366f1" },
];

// Emojis sugeridos para turnos personalizados
const SUGGESTED_EMOJIS = ["🥂", "🍹", "🥐", "🎉", "☕", "🍽️", "🌙", "🍷", "🎊", "🌅"];

// Colores sugeridos para turnos personalizados
const SUGGESTED_COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#6366f1", // indigo
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

export function OpeningHoursEditor({
  restaurantId,
  initialHours,
  initialSpecialDays = [],
  isReadOnly,
}: OpeningHoursEditorProps) {
  // Parsear horarios iniciales desde el formato antiguo o nuevo
  const parseInitialHours = (): WeekSchedule => {
    const schedule: WeekSchedule = {};

    DAYS.forEach((day) => {
      const hours = initialHours?.[day];

      if (!hours) {
        schedule[day] = {
          enabled: false,
          shifts: [],
        };
      } else if (typeof hours === "string") {
        // FORMATO ANTIGUO: "13:00-16:00,20:00-23:30" o "Cerrado"
        if (hours === "Cerrado") {
          schedule[day] = {
            enabled: false,
            shifts: [],
          };
        } else {
          const shifts: Shift[] = [];
          const ranges = hours.split(",");

          ranges.forEach((range: string, index: number) => {
            const [start, end] = range.trim().split("-");
            if (start && end) {
              // Intentar detectar el tipo de turno por la hora
              let shiftName = "Turno " + (index + 1);
              let shiftEmoji = "⏰";
              let shiftColor: string | undefined;

              const startHour = parseInt(start.split(":")[0]);
              if (startHour >= 7 && startHour < 12) {
                shiftName = "Desayuno";
                shiftEmoji = "☕";
                shiftColor = "#f59e0b";
              } else if (startHour >= 12 && startHour < 17) {
                shiftName = "Comida";
                shiftEmoji = "🍽️";
                shiftColor = "#10b981";
              } else if (startHour >= 19 || startHour < 2) {
                shiftName = "Cena";
                shiftEmoji = "🌙";
                shiftColor = "#6366f1";
              }

              shifts.push({
                id: `${day}-${index}`,
                name: shiftName,
                emoji: shiftEmoji,
                startTime: start,
                endTime: end,
                color: shiftColor,
                isCustom: false,
              });
            }
          });

          schedule[day] = {
            enabled: shifts.length > 0,
            shifts,
          };
        }
      } else if (typeof hours === "object" && "enabled" in hours && "shifts" in hours) {
        // FORMATO NUEVO: Objeto DaySchedule completo
        schedule[day] = hours as DaySchedule;
      } else {
        // Fallback para datos inesperados
        schedule[day] = {
          enabled: false,
          shifts: [],
        };
      }
    });

    return schedule;
  };

  const [schedule, setSchedule] = useState<WeekSchedule>(parseInitialHours());
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>(initialSpecialDays);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(DAYS));

  // Estado para auto-guardado
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Estados para diálogos de confirmación
  const [showApplyToAllConfirm, setShowApplyToAllConfirm] = useState(false);
  const [showConflictConfirm, setShowConflictConfirm] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [pendingSourceDay, setPendingSourceDay] = useState<string | null>(null);

  // Estados para turno personalizado
  const [showCustomShiftDialog, setShowCustomShiftDialog] = useState(false);
  const [currentEditingDay, setCurrentEditingDay] = useState<string | null>(null);
  const [customShift, setCustomShift] = useState<Partial<Shift>>({
    name: "",
    emoji: "🥂",
    startTime: "11:00",
    endTime: "15:00",
    color: "#f59e0b",
    isCustom: true,
  });

  // Estados para gestor de turnos personalizados
  const [showShiftManagerDialog, setShowShiftManagerDialog] = useState(false);
  const [editingShiftTemplate, setEditingShiftTemplate] = useState<Shift | null>(null);
  const [showDeleteShiftConfirm, setShowDeleteShiftConfirm] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  // Auto-guardado con debounce
  useEffect(() => {
    // No guardar en el montaje inicial
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // No auto-guardar si está en modo lectura
    if (isReadOnly) return;

    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Mostrar estado "guardando"
    setSaveStatus("saving");

    // Crear nuevo timeout para guardar después de 800ms de inactividad
    saveTimeoutRef.current = setTimeout(async () => {
      await autoSaveChanges();
    }, 800);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [schedule, specialDays]);

  // Función de auto-guardado (sin validación de conflictos)
  const autoSaveChanges = async () => {
    try {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      // Guardar el schedule completo con todos los detalles de los turnos
      formData.set("openingHours", JSON.stringify(schedule));
      formData.set("specialDays", JSON.stringify(specialDays));

      await updateOpeningHours(formData);
      setSaveStatus("saved");

      // Volver a "idle" después de 2 segundos
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err: any) {
      console.error("Error en auto-guardado:", err);
      setSaveStatus("idle");
      setErrorMessage(err?.message || "Error al auto-guardar");
    }
  };

  // Toggle día abierto/cerrado
  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        shifts: !prev[day].enabled && prev[day].shifts.length === 0
          ? [createDefaultShift(day, 0, "Comida")]
          : prev[day].shifts,
      },
    }));
  };

  // Crear un turno por defecto
  const createDefaultShift = (day: string, index: number, templateName?: string): Shift => {
    const template = SHIFT_TEMPLATES.find(t => t.name === templateName) || SHIFT_TEMPLATES[1];
    return {
      id: `${day}-${Date.now()}-${index}`,
      name: template.name,
      emoji: template.emoji,
      startTime: template.defaultStart,
      endTime: template.defaultEnd,
      color: template.color,
      isCustom: false,
    };
  };

  // Abrir diálogo para crear turno personalizado
  const openCustomShiftDialog = (day: string) => {
    setCurrentEditingDay(day);
    setCustomShift({
      name: "",
      emoji: "🥂",
      startTime: "11:00",
      endTime: "15:00",
      color: "#f59e0b",
      isCustom: true,
    });
    setShowCustomShiftDialog(true);
  };

  // Guardar turno personalizado
  const saveCustomShift = () => {
    if (!currentEditingDay || !customShift.name) return;

    const newShift: Shift = {
      id: `${currentEditingDay}-${Date.now()}`,
      name: customShift.name!,
      emoji: customShift.emoji!,
      startTime: customShift.startTime!,
      endTime: customShift.endTime!,
      color: customShift.color,
      isCustom: true,
    };

    setSchedule((prev) => {
      const newShifts = [...prev[currentEditingDay].shifts, newShift];
      const sortedShifts = sortShiftsByTime(newShifts);

      return {
        ...prev,
        [currentEditingDay]: {
          ...prev[currentEditingDay],
          shifts: sortedShifts,
          enabled: true,
        },
      };
    });

    setShowCustomShiftDialog(false);
    setCurrentEditingDay(null);
  };

  // Función auxiliar para ordenar turnos por hora de inicio
  const sortShiftsByTime = (shifts: Shift[]): Shift[] => {
    return [...shifts].sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });
  };

  // Obtener turnos personalizados únicos del schedule
  const getUniqueCustomShifts = (): Shift[] => {
    const customShifts: Shift[] = [];
    const seen = new Set<string>();

    DAYS.forEach(day => {
      schedule[day].shifts.forEach(shift => {
        if (shift.isCustom && !seen.has(shift.name)) {
          seen.add(shift.name);
          customShifts.push(shift);
        }
      });
    });

    return customShifts;
  };

  // Editar un turno personalizado (actualiza todos los usos)
  const updateCustomShiftTemplate = (oldName: string, updatedShift: Partial<Shift>) => {
    setSchedule((prev) => {
      const newSchedule = { ...prev };

      DAYS.forEach(day => {
        newSchedule[day] = {
          ...newSchedule[day],
          shifts: newSchedule[day].shifts.map(shift => {
            if (shift.isCustom && shift.name === oldName) {
              return {
                ...shift,
                name: updatedShift.name || shift.name,
                emoji: updatedShift.emoji || shift.emoji,
                color: updatedShift.color || shift.color,
                // Mantener horarios existentes, no los actualizamos
              };
            }
            return shift;
          })
        };
      });

      return newSchedule;
    });

    setEditingShiftTemplate(null);
  };

  // Eliminar un turno personalizado de todos los días
  const deleteCustomShiftTemplate = (shiftName: string) => {
    setSchedule((prev) => {
      const newSchedule = { ...prev };

      DAYS.forEach(day => {
        newSchedule[day] = {
          ...newSchedule[day],
          shifts: newSchedule[day].shifts.filter(shift =>
            !(shift.isCustom && shift.name === shiftName)
          ),
          // Deshabilitar el día si se queda sin turnos
          enabled: newSchedule[day].shifts.filter(shift =>
            !(shift.isCustom && shift.name === shiftName)
          ).length > 0 && newSchedule[day].enabled
        };
      });

      return newSchedule;
    });

    setShiftToDelete(null);
    setShowDeleteShiftConfirm(false);
  };

  // Añadir turno a un día (plantilla o personalizado existente)
  const addShift = (day: string, templateName: string, customShiftSource?: Shift) => {
    setSchedule((prev) => {
      let newShift: Shift;

      if (customShiftSource) {
        // Clonar turno personalizado existente
        newShift = {
          ...customShiftSource,
          id: `${day}-${Date.now()}-${prev[day].shifts.length}`,
        };
      } else {
        // Crear desde plantilla
        newShift = createDefaultShift(day, prev[day].shifts.length, templateName);
      }

      const newShifts = [...prev[day].shifts, newShift];
      const sortedShifts = sortShiftsByTime(newShifts);

      return {
        ...prev,
        [day]: {
          ...prev[day],
          shifts: sortedShifts,
          enabled: true,
        },
      };
    });
  };

  // Eliminar turno
  const removeShift = (day: string, shiftId: string) => {
    setSchedule((prev) => {
      const newShifts = prev[day].shifts.filter((s) => s.id !== shiftId);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          shifts: newShifts,
          enabled: newShifts.length > 0,
        },
      };
    });
  };

  // Actualizar turno
  const updateShift = (day: string, shiftId: string, field: keyof Shift, value: string) => {
    setSchedule((prev) => {
      const updatedShifts = prev[day].shifts.map((shift) =>
        shift.id === shiftId ? { ...shift, [field]: value } : shift
      );

      // Si se actualizó startTime, reordenar
      const shouldSort = field === 'startTime';
      const finalShifts = shouldSort ? sortShiftsByTime(updatedShifts) : updatedShifts;

      return {
        ...prev,
        [day]: {
          ...prev[day],
          shifts: finalShifts,
        },
      };
    });
  };

  // Aplicar horarios a todos los días
  const applyToAllDays = (sourceDay: string) => {
    setPendingSourceDay(sourceDay);
    setShowApplyToAllConfirm(true);
  };

  const confirmApplyToAll = () => {
    if (!pendingSourceDay) return;

    const sourceSchedule = schedule[pendingSourceDay];
    const newSchedule: WeekSchedule = {};

    DAYS.forEach((day) => {
      newSchedule[day] = {
        enabled: sourceSchedule.enabled,
        shifts: sourceSchedule.shifts.map((shift, index) => ({
          ...shift,
          id: `${day}-${Date.now()}-${index}`,
        })),
      };
    });

    setSchedule(newSchedule);
    setShowApplyToAllConfirm(false);
    setPendingSourceDay(null);
  };

  // Toggle expandir/colapsar día
  const toggleExpanded = (day: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  // Generar preview en lenguaje natural
  const generatePreview = (): string => {
    const openDays: string[] = [];
    const closedDays: string[] = [];

    DAYS.forEach((day) => {
      if (schedule[day].enabled && schedule[day].shifts.length > 0) {
        openDays.push(day);
      } else {
        closedDays.push(day);
      }
    });

    if (openDays.length === 0) {
      return "⚠️ El restaurante está cerrado todos los días";
    }

    if (openDays.length === 7) {
      // Ver si todos tienen los mismos horarios
      const firstDayShifts = schedule[DAYS[0]].shifts;
      const allSame = DAYS.every((day) => {
        const dayShifts = schedule[day].shifts;
        if (dayShifts.length !== firstDayShifts.length) return false;
        return dayShifts.every((shift, i) =>
          shift.startTime === firstDayShifts[i].startTime &&
          shift.endTime === firstDayShifts[i].endTime
        );
      });

      if (allSame) {
        const shiftsText = firstDayShifts
          .map((s) => `${s.startTime} a ${s.endTime}`)
          .join(" y ");
        return `🟢 Abierto todos los días de ${shiftsText}`;
      }
    }

    // Agrupar días consecutivos
    let preview = "🟢 Abierto ";

    if (openDays.length === 5 && !openDays.includes("Sábado") && !openDays.includes("Domingo")) {
      preview += "lunes a viernes";
    } else if (openDays.length >= 5) {
      preview += openDays.slice(0, -1).join(", ") + " y " + openDays[openDays.length - 1];
    } else {
      preview += openDays.join(", ");
    }

    if (closedDays.length > 0 && closedDays.length <= 2) {
      preview += ` • 🔴 Cerrado ${closedDays.join(" y ")}`;
    }

    return preview;
  };

  // Validar cambios con reservas existentes
  const validateWithReservations = async (): Promise<{ hasConflicts: boolean; message?: string }> => {
    try {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      formData.set("openingHours", JSON.stringify(schedule));
      formData.set("specialDays", JSON.stringify(specialDays));
      formData.set("action", "validate");

      const response = await fetch("/api/validate-hours", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        return { hasConflicts: false };
      }

      const data = await response.json();
      return {
        hasConflicts: data.hasConflicts,
        message: data.message,
      };
    } catch (error) {
      console.error("Error validating hours:", error);
      return { hasConflicts: false };
    }
  };

  // Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setErrorMessage(null);
    setWarningMessage(null);

    // Validar con reservas existentes
    const validation = await validateWithReservations();
    if (validation.hasConflicts && validation.message) {
      setWarningMessage(validation.message);
      setConflictMessage(validation.message);
      setShowConflictConfirm(true);
      return;
    }

    // Si no hay conflictos, proceder directamente
    await saveChanges();
  };

  // Confirmar guardado con conflictos
  const confirmSaveWithConflicts = async () => {
    setShowConflictConfirm(false);
    await saveChanges();
  };

  // Guardar cambios (extraído para reutilizar)
  const saveChanges = async () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("restaurantId", restaurantId);
        // Guardar el schedule completo con todos los detalles de los turnos
        formData.set("openingHours", JSON.stringify(schedule));
        formData.set("specialDays", JSON.stringify(specialDays));

        await updateOpeningHours(formData);
        setWarningMessage(null);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err?.message || "Error al guardar los horarios");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Preview en lenguaje natural */}
      <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-lg px-4 py-3">
        <div className="text-sm text-indigo-200 font-medium">
          {generatePreview()}
        </div>
      </div>

      {/* Sección: Horario general del establecimiento */}
      <div className="space-y-4 pt-4 border-t border-cyan-500/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <span className="text-lg">🏪</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-cyan-100 mb-1">
              Horario del establecimiento
            </h3>
            <p className="text-xs text-cyan-200/60 leading-relaxed">
              Horario general de apertura y cierre. Responde a preguntas como "¿A qué hora abrís?" o "¿Hasta qué hora puedo ir?".
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {DAYS.map((day) => {
            const daySchedule = schedule[day];
            const isEnabled = daySchedule?.enabled;

            return (
              <div
                key={`venue-${day}`}
                className={`rounded-lg border p-3 transition-all ${
                  isEnabled
                    ? "bg-zinc-900/40 border-zinc-700"
                    : "bg-zinc-900/20 border-zinc-800"
                }`}
              >
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => {
                      setSchedule((prev) => ({
                        ...prev,
                        [day]: {
                          ...prev[day],
                          enabled: !isEnabled,
                          shifts: prev[day]?.shifts || [],
                        },
                      }));
                    }}
                    disabled={isReadOnly || isPending}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900 disabled:opacity-50"
                  />
                  <span className={`text-xs font-medium ${isEnabled ? "text-zinc-300" : "text-zinc-500"}`}>{day}</span>
                </label>
                {isEnabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={daySchedule.openTime || "12:00"}
                      onChange={(e) => {
                        setSchedule((prev) => ({
                          ...prev,
                          [day]: {
                            ...prev[day],
                            openTime: e.target.value,
                          },
                        }));
                      }}
                      disabled={isReadOnly || isPending}
                      className="flex-1 text-xs rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-zinc-200 disabled:opacity-50"
                    />
                    <span className="text-zinc-500 text-xs">→</span>
                    <input
                      type="time"
                      value={daySchedule.closeTime || "00:00"}
                      onChange={(e) => {
                        setSchedule((prev) => ({
                          ...prev,
                          [day]: {
                            ...prev[day],
                            closeTime: e.target.value,
                          },
                        }));
                      }}
                      disabled={isReadOnly || isPending}
                      className="flex-1 text-xs rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-zinc-200 disabled:opacity-50"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-rose-400/70 italic pl-6">Cerrado</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botón para aplicar horario a todos los días abiertos */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              // Encontrar el primer día abierto con horario
              const firstOpenDay = DAYS.find(day => schedule[day]?.enabled);
              if (!firstOpenDay) return;

              const sourceSchedule = schedule[firstOpenDay];
              const openTime = sourceSchedule.openTime || "12:00";
              const closeTime = sourceSchedule.closeTime || "00:00";

              setSchedule((prev) => {
                const newSchedule = { ...prev };
                DAYS.forEach(day => {
                  if (newSchedule[day]?.enabled) {
                    newSchedule[day] = {
                      ...newSchedule[day],
                      openTime,
                      closeTime,
                    };
                  }
                });
                return newSchedule;
              });
            }}
            disabled={isReadOnly || isPending}
            className="text-xs px-3 py-1.5 rounded bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Aplicar mismo horario a todos los días abiertos
          </button>
        </div>
      </div>

      {/* Timeline visual */}
      <div className="pb-2">
        <WeekTimeline schedule={schedule} specialDays={specialDays} />
      </div>

      {/* Indicador de auto-guardado - sticky debajo del timeline */}
      {(saveStatus === "saving" || saveStatus === "saved") && (
        <div className="sticky top-16 z-30 bg-[#0b0b0d]/95 backdrop-blur-sm border-b border-zinc-800/50 -mx-4 px-4 py-2 mb-4">
          {saveStatus === "saving" && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Guardando cambios…</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 animate-in fade-in duration-200">
              <span className="text-base">✓</span>
              <span>Cambios guardados</span>
            </div>
          )}
        </div>
      )}

      {/* Sección: Días especiales y excepciones */}
      <div className="space-y-4 pt-8 border-t-2 border-amber-500/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <span className="text-lg">⚠️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-amber-100 mb-1">
              Días especiales y excepciones
            </h3>
            <p className="text-xs text-amber-200/60 leading-relaxed">
              Configura cierres, horarios especiales o eventos privados para fechas específicas.
              Estas excepciones tienen prioridad sobre el horario semanal regular.
            </p>
          </div>
        </div>

        <SpecialDaysManager
          specialDays={specialDays}
          onUpdate={setSpecialDays}
          isReadOnly={isReadOnly}
        />
      </div>

      {/* Mensajes de error (solo para casos críticos con validación manual) */}
      {(errorMessage || warningMessage) && (
        <div className="space-y-3">
          {errorMessage && (
            <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
              {errorMessage}
            </div>
          )}
          {warningMessage && (
            <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-md px-3 py-2">
              ⚠️ {warningMessage}
            </div>
          )}
        </div>
      )}

      {/* Sección: Turnos de cocina/servicio */}
      <div className="space-y-4 pt-8 border-t-2 border-indigo-500/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <span className="text-lg">🍽️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-indigo-100 mb-1">
              Turnos de cocina / servicio
            </h3>
            <p className="text-xs text-indigo-200/60 leading-relaxed">
              Horarios en los que se sirve cocina. Responde a "¿A qué hora puedo comer/cenar?".
              Los turnos definen cuándo el cliente puede reservar mesa.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {DAYS.map((day) => {
          const isExpanded = expandedDays.has(day);
          const daySchedule = schedule[day];

          return (
            <div
              key={day}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
            >
              {/* Header del día */}
              <div className="flex items-center gap-3 p-3 bg-zinc-900/60">
                {/* Checkbox abierto/cerrado */}
                <label className="flex items-center gap-2 min-w-[100px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={daySchedule.enabled}
                    onChange={() => toggleDay(day)}
                    disabled={isReadOnly || isPending}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-zinc-200">{day}</span>
                </label>

                {/* Resumen de horarios */}
                <div className="flex-1 text-sm text-zinc-400">
                  {daySchedule.enabled && daySchedule.shifts.length > 0 ? (
                    daySchedule.shifts.map((shift, i) => (
                      <span key={shift.id}>
                        {i > 0 && ", "}
                        {shift.emoji} {shift.startTime}-{shift.endTime}
                      </span>
                    ))
                  ) : (
                    <span className="italic">Cerrado</span>
                  )}
                </div>

                {/* Botón aplicar a todos */}
                {daySchedule.enabled && (
                  <button
                    type="button"
                    onClick={() => applyToAllDays(day)}
                    disabled={isReadOnly || isPending}
                    className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aplicar a todos
                  </button>
                )}

                {/* Botón expandir/colapsar */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(day)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
              </div>

              {/* Detalles expandidos */}
              {isExpanded && daySchedule.enabled && (
                <div className="p-3 space-y-3 border-t border-zinc-800">
                  {/* Lista de turnos */}
                  {daySchedule.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center gap-2 p-2 rounded bg-zinc-900/60"
                    >
                      {/* Mostrar nombre del turno */}
                      {shift.isCustom ? (
                        // Si es turno personalizado, mostrar badge no editable
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium"
                          style={{
                            backgroundColor: shift.color ? `${shift.color}20` : "#6366f120",
                            borderColor: shift.color || "#6366f1",
                            color: "#e4e4e7"
                          }}
                        >
                          <span>{shift.emoji}</span>
                          <span>{shift.name}</span>
                        </div>
                      ) : (
                        // Si es turno de plantilla, mostrar selector
                        <select
                          value={shift.name}
                          onChange={(e) => {
                            const template = SHIFT_TEMPLATES.find(t => t.name === e.target.value);
                            if (template) {
                              updateShift(day, shift.id, "name", template.name);
                              updateShift(day, shift.id, "emoji", template.emoji);
                              updateShift(day, shift.id, "color", template.color);
                            }
                          }}
                          disabled={isReadOnly || isPending}
                          className="text-sm rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-200 disabled:opacity-50"
                        >
                          {SHIFT_TEMPLATES.map((template) => (
                            <option key={template.name} value={template.name}>
                              {template.emoji} {template.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Hora inicio */}
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => updateShift(day, shift.id, "startTime", e.target.value)}
                        disabled={isReadOnly || isPending}
                        className="text-sm rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-200 disabled:opacity-50"
                      />

                      <span className="text-zinc-500">→</span>

                      {/* Hora fin */}
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => updateShift(day, shift.id, "endTime", e.target.value)}
                        disabled={isReadOnly || isPending}
                        className="text-sm rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-200 disabled:opacity-50"
                      />

                      {/* Botón eliminar */}
                      <button
                        type="button"
                        onClick={() => removeShift(day, shift.id)}
                        disabled={isReadOnly || isPending}
                        className="ml-auto text-rose-400 hover:text-rose-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Botones para añadir turnos */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Plantillas base */}
                    {SHIFT_TEMPLATES.map((template) => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => addShift(day, template.name)}
                        disabled={isReadOnly || isPending}
                        className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + {template.emoji} {template.name}
                      </button>
                    ))}

                    {/* Turnos personalizados existentes */}
                    {getUniqueCustomShifts().map((customShift) => (
                      <button
                        key={customShift.name}
                        type="button"
                        onClick={() => addShift(day, customShift.name, customShift)}
                        disabled={isReadOnly || isPending}
                        className="text-xs px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: customShift.color ? `${customShift.color}30` : "#6366f130",
                          borderColor: customShift.color || "#6366f1",
                          color: "#e4e4e7"
                        }}
                      >
                        + {customShift.emoji} {customShift.name}
                      </button>
                    ))}

                    {/* Botón para crear nuevo turno personalizado */}
                    <button
                      type="button"
                      onClick={() => openCustomShiftDialog(day)}
                      disabled={isReadOnly || isPending}
                      className="text-xs px-2 py-1 rounded bg-indigo-800 hover:bg-indigo-700 text-indigo-200 border border-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + ✨ Turno personalizado
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Botón para gestionar plantillas de turnos (fuera del loop) */}
      {getUniqueCustomShifts().length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowShiftManagerDialog(true)}
            disabled={isReadOnly || isPending}
            className="text-sm px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Gestionar turnos personalizados ({getUniqueCustomShifts().length})</span>
          </button>
        </div>
      )}

      {/* Botón manual oculto - solo para validación con conflictos si es necesario */}
      <button
        type="submit"
        disabled={isReadOnly || isPending}
        className="hidden"
      >
        {isPending ? "Guardando…" : "Guardar horarios"}
      </button>

      {/* Diálogo: Aplicar a todos los días */}
      <ConfirmDialog
        isOpen={showApplyToAllConfirm}
        title="Aplicar horarios a todos los días"
        message={`¿Aplicar los horarios de ${pendingSourceDay} a todos los días de la semana?`}
        confirmText="Aplicar a todos"
        cancelText="Cancelar"
        variant="info"
        onConfirm={confirmApplyToAll}
        onCancel={() => {
          setShowApplyToAllConfirm(false);
          setPendingSourceDay(null);
        }}
      />

      {/* Diálogo: Conflicto con reservas */}
      <ConfirmDialog
        isOpen={showConflictConfirm}
        title="Advertencia: Conflicto con reservas"
        message={`${conflictMessage}\n\n¿Deseas continuar de todas formas? Deberás contactar a los clientes afectados.`}
        confirmText="Continuar de todas formas"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={confirmSaveWithConflicts}
        onCancel={() => {
          setShowConflictConfirm(false);
          setConflictMessage("");
        }}
      />

      {/* Diálogo: Turno personalizado */}
      {showCustomShiftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                ✨ Crear turno personalizado
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Define un turno único para tu restaurante con nombre, horario y emoji personalizados.
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Nombre del turno */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del turno *
                </label>
                <input
                  type="text"
                  value={customShift.name}
                  onChange={(e) => setCustomShift({ ...customShift, name: e.target.value })}
                  placeholder="Ej: Brunch, Happy Hour, Merienda..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Emoji selector */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Emoji
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCustomShift({ ...customShift, emoji })}
                      className={`w-10 h-10 rounded-lg border text-xl transition-all ${
                        customShift.emoji === emoji
                          ? "bg-indigo-600 border-indigo-500 scale-110"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={customShift.emoji}
                    onChange={(e) => setCustomShift({ ...customShift, emoji: e.target.value })}
                    placeholder="O escribe..."
                    maxLength={2}
                    className="w-20 h-10 rounded-lg bg-zinc-800 border border-zinc-700 px-2 text-center text-xl"
                  />
                </div>
              </div>

              {/* Horarios */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    value={customShift.startTime}
                    onChange={(e) => setCustomShift({ ...customShift, startTime: e.target.value })}
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Hora fin *
                  </label>
                  <input
                    type="time"
                    value={customShift.endTime}
                    onChange={(e) => setCustomShift({ ...customShift, endTime: e.target.value })}
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200"
                  />
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Color (opcional)
                </label>
                <div className="flex gap-2 flex-wrap items-center">
                  {SUGGESTED_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCustomShift({ ...customShift, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        customShift.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={customShift.color}
                    onChange={(e) => setCustomShift({ ...customShift, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-2">Vista previa:</p>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded border"
                  style={{
                    backgroundColor: customShift.color ? `${customShift.color}20` : "#f59e0b20",
                    borderColor: customShift.color || "#f59e0b",
                  }}
                >
                  <span className="text-base">{customShift.emoji}</span>
                  <span className="text-sm font-medium text-zinc-200">
                    {customShift.name || "Nombre del turno"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {customShift.startTime} - {customShift.endTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCustomShiftDialog(false);
                  setCurrentEditingDay(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCustomShift}
                disabled={!customShift.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Gestor de turnos personalizados */}
      {showShiftManagerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-xl font-semibold text-zinc-100">
                ⚙️ Gestor de turnos personalizados
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Edita o elimina tus turnos personalizados. Los cambios se aplicarán a todos los días que usen estos turnos.
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {getUniqueCustomShifts().length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No hay turnos personalizados creados
                </div>
              ) : (
                getUniqueCustomShifts().map((shift) => (
                  <div
                    key={shift.name}
                    className="flex items-center justify-between p-4 rounded-lg border bg-zinc-900/40"
                    style={{
                      borderColor: shift.color || "#6366f1",
                    }}
                  >
                    {/* Shift info */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{
                          backgroundColor: shift.color ? `${shift.color}20` : "#6366f120",
                        }}
                      >
                        {shift.emoji}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-200">{shift.name}</div>
                        <div className="text-xs text-zinc-500">
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShiftTemplate(shift);
                          setShowShiftManagerDialog(false);
                        }}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShiftToDelete(shift);
                          setShowDeleteShiftConfirm(true);
                          setShowShiftManagerDialog(false);
                        }}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-rose-900/50 hover:bg-rose-900 text-rose-200 border border-rose-800 transition-colors"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowShiftManagerDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Editar turno personalizado */}
      {editingShiftTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-xl font-semibold text-zinc-100">
                ✏️ Editar turno personalizado
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Los cambios se aplicarán a todos los días que usen este turno
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Nombre */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del turno *
                </label>
                <input
                  type="text"
                  value={editingShiftTemplate.name}
                  onChange={(e) => setEditingShiftTemplate({ ...editingShiftTemplate, name: e.target.value })}
                  placeholder="Ej: Brunch, Happy Hour, Merienda..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Emoji selector */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Emoji
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditingShiftTemplate({ ...editingShiftTemplate, emoji })}
                      className={`w-10 h-10 rounded-lg border text-xl transition-all ${
                        editingShiftTemplate.emoji === emoji
                          ? "bg-indigo-600 border-indigo-500 scale-110"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={editingShiftTemplate.emoji}
                    onChange={(e) => setEditingShiftTemplate({ ...editingShiftTemplate, emoji: e.target.value })}
                    placeholder="O escribe..."
                    maxLength={2}
                    className="w-20 h-10 rounded-lg bg-zinc-800 border border-zinc-700 px-2 text-center text-xl"
                  />
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap items-center">
                  {SUGGESTED_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingShiftTemplate({ ...editingShiftTemplate, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        editingShiftTemplate.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingShiftTemplate.color}
                    onChange={(e) => setEditingShiftTemplate({ ...editingShiftTemplate, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Vista previa
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border"
                  style={{
                    backgroundColor: editingShiftTemplate.color ? `${editingShiftTemplate.color}20` : "#6366f120",
                    borderColor: editingShiftTemplate.color || "#6366f1",
                  }}
                >
                  <span className="text-base">{editingShiftTemplate.emoji}</span>
                  <span className="text-sm font-medium text-zinc-200">
                    {editingShiftTemplate.name || "Nombre del turno"}
                  </span>
                </div>
              </div>

              {/* Advertencia */}
              <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-3">
                <p className="text-xs text-amber-200">
                  ⚠️ Este cambio actualizará el nombre, emoji y color en todos los días que usen este turno. Los horarios de cada día se mantendrán sin cambios.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingShiftTemplate(null);
                  setShowShiftManagerDialog(true);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const oldName = getUniqueCustomShifts().find(s => s.name === editingShiftTemplate.name)?.name;
                  if (oldName) {
                    updateCustomShiftTemplate(oldName, editingShiftTemplate);
                    setShowShiftManagerDialog(true);
                  }
                }}
                disabled={!editingShiftTemplate.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Confirmar eliminación de turno */}
      {showDeleteShiftConfirm && shiftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-xl font-semibold text-rose-400">
                🗑️ Eliminar turno personalizado
              </h3>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300">
                ¿Estás seguro de que quieres eliminar el turno <strong className="text-zinc-100">{shiftToDelete.name}</strong>?
              </p>

              {/* Preview del turno a eliminar */}
              <div
                className="flex items-center gap-3 p-4 rounded-lg border"
                style={{
                  backgroundColor: shiftToDelete.color ? `${shiftToDelete.color}20` : "#6366f120",
                  borderColor: shiftToDelete.color || "#6366f1",
                }}
              >
                <span className="text-2xl">{shiftToDelete.emoji}</span>
                <div>
                  <div className="font-medium text-zinc-200">{shiftToDelete.name}</div>
                  <div className="text-xs text-zinc-500">
                    {shiftToDelete.startTime} - {shiftToDelete.endTime}
                  </div>
                </div>
              </div>

              <div className="bg-rose-900/20 border border-rose-800/50 rounded-lg p-3">
                <p className="text-xs text-rose-200">
                  ⚠️ Esta acción no se puede deshacer. Se eliminará este turno de todos los días de la semana.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteShiftConfirm(false);
                  setShiftToDelete(null);
                  setShowShiftManagerDialog(true);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (shiftToDelete) {
                    deleteCustomShiftTemplate(shiftToDelete.name);
                    setShowShiftManagerDialog(true);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Eliminar turno
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
