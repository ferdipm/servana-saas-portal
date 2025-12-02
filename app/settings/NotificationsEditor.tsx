"use client";

import { useState, useTransition } from "react";
import { updateNotificationSettings } from "./actions";

type NotificationSettings = {
  reminder_24h_enabled: boolean;
  reminder_message_template?: string;
  confirmation_required: boolean;
  notify_on_cancellation: boolean;
  notify_on_new_reservation: boolean;
};

type Props = {
  restaurantId: string;
  initialSettings: NotificationSettings;
  isReadOnly?: boolean;
};

export function NotificationsEditor({
  restaurantId,
  initialSettings,
  isReadOnly = false,
}: Props) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleToggle(key: keyof NotificationSettings) {
    if (isReadOnly) return;
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleSave() {
    if (isReadOnly) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateNotificationSettings(restaurantId, settings);
        setSuccessMessage("Configuración guardada correctamente.");
      } catch (err: any) {
        setErrorMessage(err?.message || "Error al guardar la configuración.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Notificaciones</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Configura los recordatorios automáticos y notificaciones por WhatsApp.
        </p>
      </div>

      {/* Mensajes */}
      {errorMessage && (
        <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-md px-3 py-2">
          {successMessage}
        </div>
      )}

      {/* Sección: Recordatorios */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
          Recordatorios automáticos
        </h3>

        <ToggleItem
          enabled={settings.reminder_24h_enabled}
          onToggle={() => handleToggle("reminder_24h_enabled")}
          disabled={isReadOnly || isPending}
          title="Recordatorio 24h antes"
          description="Envía un mensaje automático al cliente 24 horas antes de su reserva."
        />

        <ToggleItem
          enabled={settings.confirmation_required}
          onToggle={() => handleToggle("confirmation_required")}
          disabled={isReadOnly || isPending}
          title="Solicitar confirmación"
          description="El recordatorio incluirá opciones para que el cliente confirme o cancele su asistencia."
        />
      </div>

      {/* Sección: Notificaciones al restaurante */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
          Notificaciones al restaurante
        </h3>

        <ToggleItem
          enabled={settings.notify_on_new_reservation}
          onToggle={() => handleToggle("notify_on_new_reservation")}
          disabled={isReadOnly || isPending}
          title="Nueva reserva"
          description="Recibe una notificación cuando se crea una nueva reserva por WhatsApp."
        />

        <ToggleItem
          enabled={settings.notify_on_cancellation}
          onToggle={() => handleToggle("notify_on_cancellation")}
          disabled={isReadOnly || isPending}
          title="Cancelación de cliente"
          description="Recibe una notificación cuando un cliente cancela su reserva desde el recordatorio."
        />
      </div>

      {/* Info sobre funcionamiento */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-2">
        <h4 className="text-xs font-medium text-zinc-300">Cómo funcionan los recordatorios</h4>
        <ul className="text-xs text-zinc-500 space-y-1.5 list-disc list-inside">
          <li>Los recordatorios se envían automáticamente entre 23:30 y 24:30 horas antes de la reserva.</li>
          <li>Solo se envían a reservas confirmadas con número de WhatsApp válido.</li>
          <li>Si activas la confirmación, el cliente podrá responder SI o NO para confirmar su asistencia.</li>
          <li>También puedes enviar recordatorios manuales desde el detalle de cada reserva.</li>
        </ul>
      </div>

      {/* Botón guardar */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={isReadOnly || isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}

function ToggleItem({
  enabled,
  onToggle,
  disabled,
  title,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900
          disabled:opacity-60 disabled:cursor-not-allowed
          ${enabled ? "bg-indigo-600" : "bg-zinc-700"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${enabled ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
      <div className="flex-1">
        <div className="text-sm text-zinc-200">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
    </div>
  );
}
