"use client";

import { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  mode: "from" | "to";
  selectedDate: Date;
  minDate?: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

export function DatePickerModal({ isOpen, mode, selectedDate, minDate, onSelect, onClose }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  // Sincronizar viewDate cuando cambia selectedDate
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Primer día del mes y días en el mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Día de la semana del primer día (0 = domingo, ajustar para lunes = 0)
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;

  // Generar días del mes
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["L", "M", "X", "J", "V", "S", "D"];

  const goToPrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(year, month, day);
    newDate.setHours(0, 0, 0, 0);

    // Verificar si la fecha es válida (no antes de minDate)
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (newDate < min) return;
    }

    onSelect(newDate);
    onClose();
  };

  const isSelected = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const s = new Date(selectedDate);
    s.setHours(0, 0, 0, 0);
    return d.getTime() === s.getTime();
  };

  const isToday = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[70vh] overflow-auto safe-area-bottom animate-slide-up">
        {/* Handle */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto" />
        </div>

        <div className="px-4 pb-6">
          {/* Título */}
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-4">
            {mode === "from" ? "Seleccionar fecha desde" : "Seleccionar fecha hasta"}
          </h3>

          {/* Navegación de mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((name, i) => (
              <div
                key={i}
                className="h-10 flex items-center justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => (
              <div key={i} className="aspect-square">
                {day !== null && (
                  <button
                    onClick={() => handleDayClick(day)}
                    disabled={isDisabled(day)}
                    className={`
                      w-full h-full rounded-full flex items-center justify-center text-sm font-medium transition-all
                      ${isSelected(day)
                        ? "bg-indigo-600 text-white"
                        : isToday(day)
                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : isDisabled(day)
                        ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95"
                      }
                    `}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Botón cancelar */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
