"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";

export function Calendar(
  props: React.ComponentProps<typeof DayPicker>
) {
  return (
    <DayPicker
      showOutsideDays
      className={cn(
        "rdp bg-white dark:bg-[#111217] text-zinc-900 dark:text-zinc-100 rounded-lg p-3",
      )}
      {...props}
    />
  );
}
