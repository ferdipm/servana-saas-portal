"use client";

import { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  fromDate: Date;
  toDate: Date | null;
  onRangeSelect: (from: Date, to: Date) => void;
  onClose: () => void;
};

export function DatePickerModal({ isOpen, fromDate, toDate, onRangeSelect, onClose }: Props) {
  // Paso 1 = seleccionando "desde", Paso 2 = seleccionando "hasta"
  const [step, setStep] = useState<1 | 2>(1);
  const [tempFrom, setTempFrom] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date(fromDate));

  // Reset state cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTempFrom(null);
      setViewDate(new Date(fromDate));
    }
  }, [isOpen, fromDate]);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Primer dia del mes y dias en el mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Dia de la semana del primer dia (0 = domingo, ajustar para lunes = 0)
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;

  // Generar dias del mes
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
    const clickedDate = new Date(year, month, day);
    clickedDate.setHours(0, 0, 0, 0);

    if (step === 1) {
      // Primer click: seleccionar "desde"
      setTempFrom(clickedDate);
      setStep(2);
    } else {
      // Segundo click: seleccionar "hasta"
      if (tempFrom) {
        // Si clickan una fecha anterior al "desde", intercambiar
        if (clickedDate < tempFrom) {
          onRangeSelect(clickedDate, tempFrom);
        } else {
          onRangeSelect(tempFrom, clickedDate);
        }
        onClose();
      }
    }
  };

  // Determinar si un dia esta seleccionado como "desde"
  const isFromDate = (day: number) => {
    if (!tempFrom) return false;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === tempFrom.getTime();
  };

  // Determinar si un dia esta en el rango (entre from y to, durante hover preview)
  const isInRange = (day: number) => {
    if (!tempFrom || step !== 2) return false;
    // No mostrar rango mientras no hay hover - solo mostramos el from seleccionado
    return false;
  };

  const isToday = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  // Para mostrar el rango ya seleccionado (antes de confirmar)
  const isCurrentRangeStart = (day: number) => {
    if (step !== 1) return false;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const f = new Date(fromDate);
    f.setHours(0, 0, 0, 0);
    return d.getTime() === f.getTime();
  };

  const isCurrentRangeEnd = (day: number) => {
    if (step !== 1 || !toDate) return false;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(toDate);
    t.setHours(0, 0, 0, 0);
    return d.getTime() === t.getTime();
  };

  const isInCurrentRange = (day: number) => {
    if (step !== 1 || !toDate) return false;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const f = new Date(fromDate);
    f.setHours(0, 0, 0, 0);
    const t = new Date(toDate);
    t.setHours(0, 0, 0, 0);
    return d > f && d < t;
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short"
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-auto safe-area-bottom animate-slide-up">
        {/* Handle */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto" />
        </div>

        <div className="px-4 pb-6">
          {/* Titulo con indicadores de rango */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-3">
              Seleccionar rango de fechas
            </h3>

            {/* Indicadores From/To */}
            <div className="flex items-center justify-center gap-2">
              <div className={`flex-1 max-w-[140px] px-3 py-2 rounded-xl border-2 transition-all ${
                step === 1
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              }`}>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Desde</div>
                <div className={`text-sm font-semibold ${
                  step === 1 ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-900 dark:text-zinc-100"
                }`}>
                  {tempFrom ? formatDate(tempFrom) : formatDate(fromDate)}
                </div>
              </div>

              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>

              <div className={`flex-1 max-w-[140px] px-3 py-2 rounded-xl border-2 transition-all ${
                step === 2
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              }`}>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Hasta</div>
                <div className={`text-sm font-semibold ${
                  step === 2 ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  {step === 2 ? "Selecciona..." : (toDate ? formatDate(toDate) : "—")}
                </div>
              </div>
            </div>

            {/* Instruccion */}
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {step === 1 ? "Toca la fecha de inicio" : "Ahora toca la fecha final"}
            </p>
          </div>

          {/* Navegacion de mes */}
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

          {/* Dias de la semana */}
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

          {/* Dias del mes */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) {
                return <div key={i} className="aspect-square" />;
              }

              const isFrom = isFromDate(day);
              const inRange = isInRange(day);
              const isTodayDay = isToday(day);
              const isRangeStart = isCurrentRangeStart(day);
              const isRangeEnd = isCurrentRangeEnd(day);
              const inCurrentRange = isInCurrentRange(day);

              return (
                <div key={i} className="aspect-square relative">
                  {/* Fondo del rango */}
                  {(inCurrentRange || inRange) && (
                    <div className="absolute inset-y-1 inset-x-0 bg-indigo-100 dark:bg-indigo-900/30" />
                  )}
                  {(isRangeStart || isFrom) && (
                    <div className="absolute inset-y-1 left-1/2 right-0 bg-indigo-100 dark:bg-indigo-900/30" />
                  )}
                  {isRangeEnd && (
                    <div className="absolute inset-y-1 left-0 right-1/2 bg-indigo-100 dark:bg-indigo-900/30" />
                  )}

                  <button
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative w-full h-full rounded-full flex items-center justify-center text-sm font-medium transition-all z-10
                      ${isFrom || isRangeStart || isRangeEnd
                        ? "bg-indigo-600 text-white"
                        : isTodayDay
                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95"
                      }
                    `}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Boton cancelar */}
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
