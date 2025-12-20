"use client";

import { useState, useTransition } from "react";
import { updateBotSettings } from "./actions";

type BotSettings = {
  reservation_mode: "auto_confirm" | "pending" | "disabled";
  disabled_message?: string;
};

type BotSettingsEditorProps = {
  restaurantId: string;
  initialSettings: BotSettings | null;
  isReadOnly: boolean;
  restaurantPhone?: string;
};

export function BotSettingsEditor({
  restaurantId,
  initialSettings,
  isReadOnly,
  restaurantPhone,
}: BotSettingsEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default values
  const defaultSettings: BotSettings = {
    reservation_mode: "auto_confirm",
    disabled_message: restaurantPhone
      ? `En este momento no tomamos reservas online. Por favor, llámenos al ${restaurantPhone}.`
      : "En este momento no tomamos reservas online. Por favor, llámenos al restaurante.",
  };

  const [settings, setSettings] = useState<BotSettings>({
    ...defaultSettings,
    ...initialSettings,
  });

  function handleModeChange(mode: BotSettings["reservation_mode"]) {
    setSettings((prev) => ({ ...prev, reservation_mode: mode }));
  }

  function handleMessageChange(message: string) {
    setSettings((prev) => ({ ...prev, disabled_message: message }));
  }

  function handleSave() {
    if (isReadOnly) return;

    setSuccessMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateBotSettings(restaurantId, settings);
        setSuccessMessage("Configuración del bot guardada correctamente.");
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err?.message || "Error al guardar la configuración del bot.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Configuración del Bot
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configura cómo funciona el bot de WhatsApp para tu restaurante.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 rounded-md px-3 py-2">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 rounded-md px-3 py-2">
          {errorMessage}
        </div>
      )}

      {/* Reservation Mode Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
          Modo de Reservas
        </h3>

        <div className="space-y-3">
          {/* Auto Confirm */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              settings.reservation_mode === "auto_confirm"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
            } ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="reservation_mode"
              value="auto_confirm"
              checked={settings.reservation_mode === "auto_confirm"}
              onChange={() => handleModeChange("auto_confirm")}
              disabled={isReadOnly}
              className="mt-1 h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Confirmación automática
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Las reservas se confirman instantáneamente y el cliente recibe un QR de confirmación.
              </p>
            </div>
          </label>

          {/* Pending / Manual */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              settings.reservation_mode === "pending"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
            } ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="reservation_mode"
              value="pending"
              checked={settings.reservation_mode === "pending"}
              onChange={() => handleModeChange("pending")}
              disabled={isReadOnly}
              className="mt-1 h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Aprobación manual
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full">
                  Requiere acción
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Las reservas entran como &quot;pendientes&quot; y debes aprobarlas manualmente desde el panel.
                El cliente recibe el QR solo cuando apruebas.
              </p>
            </div>
          </label>

          {/* Disabled */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              settings.reservation_mode === "disabled"
                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
            } ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="reservation_mode"
              value="disabled"
              checked={settings.reservation_mode === "disabled"}
              onChange={() => handleModeChange("disabled")}
              disabled={isReadOnly}
              className="mt-1 h-4 w-4 text-rose-600 border-zinc-300 dark:border-zinc-600 focus:ring-rose-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Desactivado
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-full">
                  No acepta reservas
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                El bot no acepta reservas. Solo muestra un mensaje indicando que llamen al restaurante.
              </p>
            </div>
          </label>
        </div>

        {/* Custom message for disabled mode */}
        {settings.reservation_mode === "disabled" && (
          <div className="mt-4 space-y-2 pl-8">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Mensaje cuando el cliente intente reservar:
            </label>
            <textarea
              value={settings.disabled_message || ""}
              onChange={(e) => handleMessageChange(e.target.value)}
              disabled={isReadOnly}
              rows={3}
              className="w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
              placeholder="En este momento no tomamos reservas online..."
            />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Este mensaje se enviará automáticamente cuando alguien intente hacer una reserva.
            </p>
          </div>
        )}
      </div>

      {/* Info box for pending mode */}
      {settings.reservation_mode === "pending" && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 rounded-xl">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Atención: Requiere gestión activa
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Con este modo, deberás revisar y aprobar cada reserva desde el panel.
              Las solicitudes pendientes aparecerán en la sección de &quot;Pendientes&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={handleSave}
          disabled={isReadOnly || isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          Los cambios se aplican inmediatamente.
        </p>
      </div>
    </div>
  );
}
