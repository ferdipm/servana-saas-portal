"use client";

import { HelpCircle, X } from "lucide-react";
import { useState } from "react";

interface ChartHelpButtonProps {
  title: string;
  description: string;
  interpretation: string;
}

export function ChartHelpButton({ title, description, interpretation }: ChartHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
        title="Ayuda"
      >
        <HelpCircle className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="bg-white dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">¿Qué muestra?</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">¿Cómo interpretarlo?</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{interpretation}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
