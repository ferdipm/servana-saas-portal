// @ts-nocheck
"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateGeneralSettings } from "./actions";
import { LogoUploader } from "./LogoUploader";
import { OpeningHoursEditor } from "./OpeningHoursEditor";
import { MenuEditor } from "./MenuEditor";

type InitialInfo = {
  name: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  logoUrl: string;
};

type SettingsContentProps = {
  tenantId: string;
  restaurantId: string;
  role: string;
  initialInfo: InitialInfo;
  initialFaqs: any;
  initialMenu: any;
  initialOpeningHours: any;
  initialSpecialDays?: any[];
};

type TabKey = "general" | "menu" | "faqs" | "hours" | "logo";

export function SettingsContent({
  tenantId,
  restaurantId,
  role,
  initialInfo,
  initialFaqs,
  initialMenu,
  initialOpeningHours,
  initialSpecialDays = [],
}: SettingsContentProps) {
  const [tab, setTab] = useState<TabKey>("general");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isReadOnly =
    role === "staff" ||
    role === "waiter" ||
    role === "viewer" ||
    role === "read_only";

  async function handleGeneralSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isReadOnly) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("restaurantId", restaurantId);

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await updateGeneralSettings(formData);
        setSuccessMessage("Cambios guardados correctamente.");
      } catch (err: any) {
        console.error(err);
        setErrorMessage(
          err?.message || "Ha ocurrido un error al guardar los datos generales."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {[
          { key: "general", label: "General" },
          { key: "hours", label: "Horarios" },
          { key: "menu", label: "Menú" },
          { key: "faqs", label: "FAQs" },
          { key: "logo", label: "Logo" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as TabKey)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Aviso de permisos */}
      {isReadOnly && (
        <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-lg px-3 py-2">
          Este usuario tiene acceso de solo lectura. No puede modificar la
          configuración del restaurante.
        </div>
      )}

      {/* Mensajes globales */}
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

      {/* Contenido por pestaña */}
      {tab === "general" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Datos generales
          </h2>
          <p className="text-xs text-zinc-400">
            Nombre, datos de contacto y dirección del restaurante.
          </p>

          <form
            onSubmit={handleGeneralSubmit}
            className="space-y-4 max-w-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <Field
                name="name"
                label="Nombre del restaurante"
                defaultValue={initialInfo.name}
                disabled={isReadOnly || isPending}
                required
              />

              {/* Teléfono: más pequeño */}
              <div className="md:col-span-1 max-w-[11rem]">
                <Field
                  name="phone"
                  label="Teléfono"
                  defaultValue={initialInfo.phone}
                  disabled={isReadOnly || isPending}
                />
              </div>

              {/* Web */}
              <Field
                name="website"
                label="Web"
                defaultValue={initialInfo.website}
                disabled={isReadOnly || isPending}
              />

              {/* Dirección: ocupa dos columnas */}
              <div className="md:col-span-2">
                <Field
                  name="address"
                  label="Dirección"
                  defaultValue={initialInfo.address}
                  disabled={isReadOnly || isPending}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isReadOnly || isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? "Guardando…" : "Guardar cambios"}
              </button>
              <p className="text-[11px] text-zinc-500">
                Estos datos se aplican solo al restaurante actual.
              </p>
            </div>
          </form>
        </section>
      )}

      {tab === "menu" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <MenuEditor
            restaurantId={restaurantId}
            initialMenu={initialMenu}
            isReadOnly={isReadOnly}
          />
        </section>
      )}

      {tab === "faqs" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">FAQs</h2>
          <p className="text-xs text-zinc-400">
            Preguntas frecuentes que el bot puede usar para responder mejor a
            tus clientes.
          </p>
          <div className="text-xs text-zinc-400">
            FAQs (JSON):
            <pre className="mt-2 bg-zinc-900/60 rounded-lg p-3 text-[10px] text-zinc-300 overflow-auto max-h-72">
{JSON.stringify(initialFaqs ?? [], null, 2)}
            </pre>
          </div>
        </section>
      )}

      {tab === "hours" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Horarios de apertura
          </h2>
          <p className="text-xs text-zinc-400">
            Configura los días y horarios en los que tu restaurante está abierto
          </p>
          <OpeningHoursEditor
            restaurantId={restaurantId}
            initialHours={initialOpeningHours}
            initialSpecialDays={initialSpecialDays}
            isReadOnly={isReadOnly}
          />
        </section>
      )}

      {tab === "logo" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">Logo</h2>
          <p className="text-xs text-zinc-400">
            Logo que se mostrará en el dashboard y en futuras comunicaciones.
          </p>
          <LogoUploader
            tenantId={tenantId}
            restaurantId={restaurantId}
            currentLogoUrl={initialInfo.logoUrl}
            isReadOnly={isReadOnly}
          />
        </section>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  disabled,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-zinc-400" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}