"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as Popover from "@radix-ui/react-popover";
import "react-day-picker/style.css";

type DatePickerProps = {
  value?: string; // Formato YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: Date;
  placeholder?: string;
  disabled?: boolean;
};

export function DatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Seleccionar fecha",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Convertir string YYYY-MM-DD a Date
  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Convertir Date a string YYYY-MM-DD en timezone local
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full text-sm rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-left text-zinc-900 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-between"
        >
          <span className={!selectedDate ? "text-zinc-400 dark:text-zinc-500" : ""}>
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: es })
              : placeholder}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500 dark:text-zinc-400"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          className="z-50 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={minDate ? { before: minDate } : undefined}
            locale={es}
            className="rdp-light dark:rdp-dark"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium text-zinc-700 dark:text-zinc-200",
              nav: "space-x-1 flex items-center",
              nav_button:
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-zinc-500 rounded-md w-8 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-indigo-100 dark:[&:has([aria-selected])]:bg-zinc-800 [&:has([aria-selected].day-outside)]:bg-indigo-50 dark:[&:has([aria-selected].day-outside)]:bg-zinc-800/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
              day: "h-8 w-8 p-0 font-normal hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-md transition-colors text-zinc-700 dark:text-zinc-300",
              day_selected:
                "bg-indigo-600 text-white hover:bg-indigo-500 hover:text-white focus:bg-indigo-600 focus:text-white",
              day_today: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
              day_outside: "text-zinc-400 dark:text-zinc-600 opacity-50",
              day_disabled: "text-zinc-400 dark:text-zinc-600 opacity-30 cursor-not-allowed",
              day_hidden: "invisible",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
