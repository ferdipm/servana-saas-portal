"use client";

import { useState, useTransition } from "react";
import { updateNotificationSettings } from "./actions";

type StaffMember = {
  phone: string;
  name: string;
  can_forward: boolean;
  receives_notifications: boolean;
};

type NotificationSettings = {
  reminder_24h_enabled: boolean;
  reminder_message_template?: string;
  confirmation_required: boolean;
  notify_on_cancellation: boolean;
  notify_on_new_reservation: boolean;
  staff_members?: StaffMember[];
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

  // Estado para añadir nuevo miembro del personal
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [showAddStaff, setShowAddStaff] = useState(false);

  const staffMembers = settings.staff_members || [];

  function handleToggle(key: keyof Omit<NotificationSettings, "staff_members">) {
    if (isReadOnly) return;
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleAddStaff() {
    if (!newStaffPhone.trim() || !newStaffName.trim()) return;

    // Normalizar teléfono (asegurar que tenga +)
    let phone = newStaffPhone.trim();
    if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }

    // Verificar que no exista ya
    if (staffMembers.some(s => s.phone === phone)) {
      setErrorMessage("Este número ya está registrado.");
      return;
    }

    const newMember: StaffMember = {
      phone,
      name: newStaffName.trim(),
      can_forward: true,
      receives_notifications: true,
    };

    setSettings(prev => ({
      ...prev,
      staff_members: [...(prev.staff_members || []), newMember],
    }));

    setNewStaffPhone("");
    setNewStaffName("");
    setShowAddStaff(false);
    setErrorMessage(null);
  }

  function handleRemoveStaff(phone: string) {
    if (isReadOnly) return;
    setSettings(prev => ({
      ...prev,
      staff_members: (prev.staff_members || []).filter(s => s.phone !== phone),
    }));
  }

  function handleToggleStaffPermission(phone: string, key: "can_forward" | "receives_notifications") {
    if (isReadOnly) return;
    setSettings(prev => ({
      ...prev,
      staff_members: (prev.staff_members || []).map(s =>
        s.phone === phone ? { ...s, [key]: !s[key] } : s
      ),
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
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notificaciones</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Configura el personal autorizado, recordatorios y notificaciones por WhatsApp.
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

      {/* Sección: Personal del restaurante */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Personal del restaurante
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Define quién puede reenviar mensajes de clientes y quién recibe notificaciones.
          </p>
        </div>

        {/* Lista de personal */}
        {staffMembers.length > 0 && (
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-800/50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Nombre</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Teléfono</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title="Puede reenviar mensajes de clientes">Reenvío</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title="Recibe notificaciones de nuevas reservas">Notif.</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {staffMembers.map((member) => (
                  <tr key={member.phone} className="bg-white dark:bg-zinc-900/30">
                    <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{member.name}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 font-mono text-xs">{member.phone}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffPermission(member.phone, "can_forward")}
                        disabled={isReadOnly || isPending}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          member.can_forward
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                        } disabled:opacity-50`}
                        title={member.can_forward ? "Puede reenviar" : "No puede reenviar"}
                      >
                        {member.can_forward && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffPermission(member.phone, "receives_notifications")}
                        disabled={isReadOnly || isPending}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          member.receives_notifications
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                        } disabled:opacity-50`}
                        title={member.receives_notifications ? "Recibe notificaciones" : "No recibe notificaciones"}
                      >
                        {member.receives_notifications && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(member.phone)}
                        disabled={isReadOnly || isPending}
                        className="p-1 text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulario para añadir */}
        {showAddStaff ? (
          <div className="flex flex-col sm:flex-row gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <input
              type="tel"
              value={newStaffPhone}
              onChange={(e) => setNewStaffPhone(e.target.value)}
              placeholder="+34612345678"
              className="flex-1 sm:w-36 h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-400/30 outline-none"
            />
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Nombre"
              className="flex-1 h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-400/30 outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddStaff}
                disabled={!newStaffPhone.trim() || !newStaffName.trim()}
                className="h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Añadir
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddStaff(false);
                  setNewStaffPhone("");
                  setNewStaffName("");
                }}
                className="h-9 px-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddStaff(true)}
            disabled={isReadOnly}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir personal
          </button>
        )}

        {/* Info sobre reenvíos */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Reenvío de mensajes:</strong> El personal autorizado puede reenviar mensajes de clientes al bot.
            El bot procesará la reserva a nombre del cliente original y pedirá confirmación antes de contactarlo.
          </p>
        </div>
      </div>

      {/* Sección: Recordatorios */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
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
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
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
      <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
        <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Cómo funcionan los recordatorios</h4>
        <ul className="text-xs text-zinc-600 dark:text-zinc-500 space-y-1.5 list-disc list-inside">
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
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
          disabled:opacity-60 disabled:cursor-not-allowed
          ${enabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"}
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
        <div className="text-sm text-zinc-900 dark:text-zinc-200">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
    </div>
  );
}
