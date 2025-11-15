"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeDebug() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [htmlClass, setHtmlClass] = useState("");

  useEffect(() => {
    setMounted(true);
    setHtmlClass(document.documentElement.className);
  }, [theme]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
      <div><strong>Theme:</strong> {theme}</div>
      <div><strong>Resolved:</strong> {resolvedTheme}</div>
      <div><strong>HTML class:</strong> {htmlClass}</div>
      <div><strong>localStorage:</strong> {typeof window !== 'undefined' ? localStorage.getItem('theme') : 'N/A'}</div>
      <button
        onClick={() => {
          console.log('Setting theme to:', theme === 'dark' ? 'light' : 'dark');
          setTheme(theme === 'dark' ? 'light' : 'dark');
        }}
        className="mt-2 bg-white text-black px-2 py-1 rounded"
      >
        Toggle (Debug)
      </button>
    </div>
  );
}
