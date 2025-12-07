"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder para evitar layout shift
    return (
      <button
        className="p-2 rounded-full bg-zinc-800/70 dark:bg-zinc-800/70 border border-zinc-700/60 dark:border-zinc-700/60"
        aria-label="Cambiar tema"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="
        p-2 rounded-full
        bg-white dark:bg-zinc-800/70
        border border-zinc-300 dark:border-zinc-700/60
        hover:bg-zinc-200 dark:hover:bg-zinc-700
        transition-colors
      "
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-zinc-600" />
      )}
    </button>
  );
}
