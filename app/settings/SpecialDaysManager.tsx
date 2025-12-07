"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";

type Shift = {
  id: string;
  name: string;
  emoji: string;
  startTime: string;
  endTime: string;
};

type SpecialDay = {
  id: string;
  date: string; // Formato YYYY-MM-DD
  name: string;
  type: "closed" | "special_hours" | "event";
  hours?: string; // Para "special_hours" y "event"
  shifts?: Shift[]; // Turnos personalizados para "special_hours"
};

type SpecialDaysManagerProps = {
  specialDays: SpecialDay[];
  onUpdate: (days: SpecialDay[]) => void;
  isReadOnly: boolean;
};

const SHIFT_TEMPLATES = [
  { name: "Desayuno", emoji: "☕", defaultStart: "08:00", defaultEnd: "12:00" },
  { name: "Comida", emoji: "🍽️", defaultStart: "13:00", defaultEnd: "16:00" },
  { name: "Cena", emoji: "🌙", defaultStart: "20:00", defaultEnd: "23:30" },
];

export function SpecialDaysManager({
  specialDays,
  onUpdate,
  isReadOnly,
}: SpecialDaysManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [showConflictConfirm, setShowConflictConfirm] = useState(false);
  const [showCustomShiftsPrompt, setShowCustomShiftsPrompt] = useState(false);
  const [conflictingDay, setConflictingDay] = useState<SpecialDay | null>(null);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [newDay, setNewDay] = useState<Partial<SpecialDay>>({
    date: "",
    name: "",
    type: "closed",
    hours: "09:00-23:00",
    shifts: [],
  });

  const addSpecialDay = () => {
    if (!newDay.date || !newDay.name) {
      setShowValidationAlert(true);
      return;
    }

    // Verificar si ya existe un día especial para esta fecha
    const existingDay = specialDays.find(d => d.date === newDay.date);
    if (existingDay) {
      setConflictingDay(existingDay);
      setShowConflictConfirm(true);
      return;
    }

    // Si es horario especial, preguntar por turnos personalizados
    if (newDay.type === "special_hours") {
      setShowCustomShiftsPrompt(true);
      return;
    }

    // Si no hay conflicto ni es horario especial, añadir directamente
    saveNewSpecialDay();
  };

  const saveNewSpecialDay = () => {
    const specialDay: SpecialDay = {
      id: `special-${Date.now()}`,
      date: newDay.date!,
      name: newDay.name!,
      type: newDay.type!,
      hours: (newDay.type === "special_hours" || newDay.type === "event") ? newDay.hours : undefined,
      shifts: newDay.type === "special_hours" && newDay.shifts && newDay.shifts.length > 0 ? newDay.shifts : undefined,
    };

    onUpdate([...specialDays, specialDay]);
    setNewDay({ date: "", name: "", type: "closed", hours: "09:00-23:00", shifts: [] });
    setShowAddForm(false);
  };

  // Funciones para manejar turnos personalizados
  const createDefaultShift = (index: number, templateName?: string): Shift => {
    const template = SHIFT_TEMPLATES.find(t => t.name === templateName) || SHIFT_TEMPLATES[1];
    return {
      id: `shift-${Date.now()}-${index}`,
      name: template.name,
      emoji: template.emoji,
      startTime: template.defaultStart,
      endTime: template.defaultEnd,
    };
  };

  const addShift = (templateName: string) => {
    const currentShifts = newDay.shifts || [];
    setNewDay({
      ...newDay,
      shifts: [...currentShifts, createDefaultShift(currentShifts.length, templateName)],
    });
  };

  const removeShift = (shiftId: string) => {
    setNewDay({
      ...newDay,
      shifts: (newDay.shifts || []).filter(s => s.id !== shiftId),
    });
  };

  const updateShift = (shiftId: string, field: keyof Shift, value: string) => {
    setNewDay({
      ...newDay,
      shifts: (newDay.shifts || []).map(shift =>
        shift.id === shiftId ? { ...shift, [field]: value } : shift
      ),
    });
  };

  const confirmReplaceSpecialDay = () => {
    if (!conflictingDay) return;

    // Eliminar el día existente y añadir el nuevo
    const updatedDays = specialDays.filter(d => d.id !== conflictingDay.id);
    const newSpecialDay: SpecialDay = {
      id: `special-${Date.now()}`,
      date: newDay.date!,
      name: newDay.name!,
      type: newDay.type!,
      hours: (newDay.type === "special_hours" || newDay.type === "event") ? newDay.hours : undefined,
      shifts: newDay.type === "special_hours" && newDay.shifts && newDay.shifts.length > 0 ? newDay.shifts : undefined,
    };

    onUpdate([...updatedDays, newSpecialDay]);
    setNewDay({ date: "", name: "", type: "closed", hours: "09:00-23:00", shifts: [] });
    setShowAddForm(false);
    setShowConflictConfirm(false);
    setConflictingDay(null);
  };

  const removeSpecialDay = (id: string) => {
    setDayToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (dayToDelete) {
      onUpdate(specialDays.filter((d) => d.id !== dayToDelete));
    }
    setShowDeleteConfirm(false);
    setDayToDelete(null);
  };

  // Ordenar días especiales por fecha
  const sortedDays = [...specialDays].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Filtrar días futuros y pasados
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDays = sortedDays.filter((d) => new Date(d.date) >= today);
  const pastDays = sortedDays.filter((d) => new Date(d.date) < today);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Días especiales y excepciones
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            Configura horarios especiales para festivos, eventos privados, etc.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {showAddForm ? "Cancelar" : "+ Añadir excepción"}
          </button>
        )}
      </div>

      {/* Formulario de añadir */}
      {showAddForm && (
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
          {/* Pregunta + Tipo de excepción */}
          <div>
            <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
              ¿Qué tipo de excepción quieres añadir?
            </label>
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50 has-[:checked]:bg-zinc-100 dark:has-[:checked]:bg-zinc-800 has-[:checked]:border-zinc-400 dark:has-[:checked]:border-zinc-600 border-zinc-200 dark:border-zinc-700/50">
                <input
                  type="radio"
                  checked={newDay.type === "closed"}
                  onChange={() => setNewDay({ ...newDay, type: "closed" })}
                  className="text-indigo-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">🔴 Cerrado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50 has-[:checked]:bg-zinc-100 dark:has-[:checked]:bg-zinc-800 has-[:checked]:border-zinc-400 dark:has-[:checked]:border-zinc-600 border-zinc-200 dark:border-zinc-700/50">
                <input
                  type="radio"
                  checked={newDay.type === "special_hours"}
                  onChange={() => setNewDay({ ...newDay, type: "special_hours" })}
                  className="text-indigo-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">⚠️ Horario especial</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50 has-[:checked]:bg-zinc-100 dark:has-[:checked]:bg-zinc-800 has-[:checked]:border-zinc-400 dark:has-[:checked]:border-zinc-600 border-zinc-200 dark:border-zinc-700/50">
                <input
                  type="radio"
                  checked={newDay.type === "event"}
                  onChange={() => setNewDay({ ...newDay, type: "event" })}
                  className="text-indigo-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">🎉 Evento privado</span>
              </label>
            </div>
          </div>

          {/* Fecha y Nombre */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Fecha</label>
              <DatePicker
                value={newDay.date}
                onChange={(date) => setNewDay({ ...newDay, date })}
                minDate={new Date()}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Nombre de la excepción</label>
              <input
                type="text"
                value={newDay.name}
                onChange={(e) => setNewDay({ ...newDay, name: e.target.value })}
                placeholder="Ej: Fiesta privada, Navidad, Renovaciones..."
                className="w-full text-sm rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Campo horario (condicional) */}
          {(newDay.type === "special_hours" || newDay.type === "event") && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                {newDay.type === "event" ? "Horario del evento" : "Horario especial"}
              </label>
              <input
                type="text"
                value={newDay.hours}
                onChange={(e) => setNewDay({ ...newDay, hours: e.target.value })}
                placeholder={newDay.type === "event" ? "18:00-00:00" : "09:00-15:00"}
                className="w-full max-w-xs text-sm rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-zinc-900 dark:text-zinc-200"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                {newDay.type === "event"
                  ? "El resto del día mantendrá su horario normal"
                  : "Se aceptarán reservas solo en los turnos que se solapen con este horario"}
              </p>
            </div>
          )}

          {/* Texto de ayuda según tipo */}
          {newDay.type === "closed" && (
            <p className="text-[11px] text-zinc-500">
              No se aceptarán reservas durante todo el día
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewDay({ date: "", name: "", type: "closed", hours: "09:00-23:00" });
              }}
              className="text-sm px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={addSpecialDay}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Guardar excepción
            </button>
          </div>
        </div>
      )}

      {/* Lista de días especiales próximos */}
      {upcomingDays.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Próximas excepciones</h4>
          {upcomingDays.map((day) => (
            <div
              key={day.id}
              className="flex items-center justify-between p-3 rounded bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {day.name}
                  </span>
                  {day.type === "closed" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      🔴 Cerrado
                    </span>
                  )}
                  {day.type === "special_hours" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      ⚠️ Horario especial
                    </span>
                  )}
                  {day.type === "event" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                      🎉 Evento privado
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {formatDate(day.date)}
                  {(day.type === "special_hours" || day.type === "event") && day.hours && (
                    <span className="ml-2">• {day.hours}</span>
                  )}
                  {day.type === "special_hours" && day.shifts && day.shifts.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-300/80">
                      Turnos especiales: {day.shifts.map(s => `${s.emoji} ${s.startTime}-${s.endTime}`).join(", ")}
                    </div>
                  )}
                </div>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => removeSpecialDay(day.id)}
                  className="text-rose-400 hover:text-rose-300 ml-4"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista de días pasados (colapsada) */}
      {pastDays.length > 0 && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-400">
            {pastDays.length} excepciones pasadas
          </summary>
          <div className="mt-2 space-y-1">
            {pastDays.map((day) => (
              <div key={day.id} className="flex items-center justify-between p-2 rounded bg-zinc-100 dark:bg-zinc-900/40">
                <span>{day.name} - {formatDate(day.date)}</span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeSpecialDay(day.id)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {specialDays.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No hay días especiales configurados
        </div>
      )}

      {/* Diálogo: Configurar turnos personalizados para horario especial */}
      {showCustomShiftsPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                ⚠️ Configurar turnos especiales
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Has establecido un horario especial para <strong className="text-amber-600 dark:text-amber-300">{newDay.name}</strong>.
                ¿Deseas configurar turnos personalizados para este día?
                Estos turnos sustituirán los horarios regulares y serán los únicos disponibles para reservas.
              </p>
            </div>

            {/* Body - Editor de turnos */}
            <div className="p-6 space-y-4">
              {/* Lista de turnos */}
              {(newDay.shifts || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Turnos configurados</h4>
                  {(newDay.shifts || []).map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700"
                    >
                      {/* Selector de tipo de turno */}
                      <select
                        value={shift.name}
                        onChange={(e) => {
                          const template = SHIFT_TEMPLATES.find(t => t.name === e.target.value);
                          if (template) {
                            updateShift(shift.id, "name", template.name);
                            updateShift(shift.id, "emoji", template.emoji);
                          }
                        }}
                        className="text-sm rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-zinc-900 dark:text-zinc-200"
                      >
                        {SHIFT_TEMPLATES.map((template) => (
                          <option key={template.name} value={template.name}>
                            {template.emoji} {template.name}
                          </option>
                        ))}
                      </select>

                      {/* Hora inicio */}
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => updateShift(shift.id, "startTime", e.target.value)}
                        className="text-sm rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-zinc-900 dark:text-zinc-200"
                      />

                      <span className="text-zinc-400 dark:text-zinc-500">→</span>

                      {/* Hora fin */}
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => updateShift(shift.id, "endTime", e.target.value)}
                        className="text-sm rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-zinc-900 dark:text-zinc-200"
                      />

                      {/* Botón eliminar */}
                      <button
                        type="button"
                        onClick={() => removeShift(shift.id)}
                        className="ml-auto text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botones para añadir turnos */}
              <div>
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Añadir turno</h4>
                <div className="flex gap-2 flex-wrap">
                  {SHIFT_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => addShift(template.name)}
                      className="text-sm px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                    >
                      + {template.emoji} {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensaje informativo */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-200/80 leading-relaxed">
                  💡 <strong>Tip:</strong> Los turnos que configures aquí serán los únicos disponibles
                  para reservas en este día especial. Si no añades turnos, se usarán los turnos regulares
                  del día que se solapen con el horario especial.
                </p>
              </div>
            </div>

            {/* Footer - Botones de acción */}
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setNewDay({ ...newDay, shifts: [] });
                  setShowCustomShiftsPrompt(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewDay({ ...newDay, shifts: [] });
                  setShowCustomShiftsPrompt(false);
                  saveNewSpecialDay();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                No, usar turnos regulares
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomShiftsPrompt(false);
                  saveNewSpecialDay();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                Sí, guardar turnos especiales
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Eliminar día especial"
        message="¿Estás seguro de que quieres eliminar este día especial?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDayToDelete(null);
        }}
      />

      {/* Diálogo de validación */}
      <ConfirmDialog
        isOpen={showValidationAlert}
        title="Campos incompletos"
        message="Por favor completa todos los campos antes de guardar."
        confirmText="Entendido"
        cancelText=""
        variant="warning"
        onConfirm={() => setShowValidationAlert(false)}
        onCancel={() => setShowValidationAlert(false)}
      />

      {/* Diálogo de conflicto de fecha */}
      <ConfirmDialog
        isOpen={showConflictConfirm}
        title="Ya existe una excepción para esta fecha"
        message={`Ya tienes configurado "${conflictingDay?.name}" para el ${conflictingDay?.date ? new Date(conflictingDay.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : ""}.\n\n¿Deseas reemplazarlo con "${newDay.name}"?`}
        confirmText="Sí, reemplazar"
        cancelText="No, cancelar"
        variant="warning"
        onConfirm={confirmReplaceSpecialDay}
        onCancel={() => {
          setShowConflictConfirm(false);
          setConflictingDay(null);
        }}
      />
    </div>
  );
}
