"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useEffect } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Force immediate sync on mount
  useEffect(() => {
    const stored = localStorage.getItem(props.storageKey || 'theme');
    if (stored) {
      document.documentElement.classList.toggle('dark', stored === 'dark');
    }
  }, [props.storageKey]);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
