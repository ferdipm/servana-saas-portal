// @ts-nocheck
"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateGeneralSettings } from "./actions";
import { LogoUploader } from "./LogoUploader";
import { OpeningHoursEditor } from "./OpeningHoursEditor";
import { MenuEditor } from "./MenuEditor";
import { SetMenusEditor } from "./SetMenusEditor";
import { WineEditor } from "./WineEditor";
import { FAQEditor } from "./FAQEditor";

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
  initialSetMenus: any;
  initialWineMenu: any;
  initialOpeningHours: any;
  initialSpecialDays?: any[];
};

type TabKey = "general" | "carta" | "vinos" | "menus" | "faqs" | "hours" | "logo";

export function SettingsContent({
  tenantId,
  restaurantId,
  role,
  initialInfo,
  initialFaqs,
  initialMenu,
  initialSetMenus,
  initialWineMenu,
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
    <div className="space-y-6">
      {/* Tabs - Modern UI with icons */}
      <div className="pt-2">
        <nav className="flex flex-wrap gap-1 p-1.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
          {[
            { key: "general", label: "General", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
            { key: "hours", label: "Horarios", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { key: "carta", label: "Carta", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { key: "vinos", label: "Vinos", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
            { key: "menus", label: "Menus", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
            { key: "faqs", label: "FAQs", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { key: "logo", label: "Logo", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
              </svg>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>
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

      {tab === "carta" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <MenuEditor
            restaurantId={restaurantId}
            initialMenu={initialMenu}
            isReadOnly={isReadOnly}
            restaurantName={initialInfo.name}
            logoUrl={initialInfo.logoUrl}
          />
        </section>
      )}

      {tab === "vinos" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <WineEditor
            restaurantId={restaurantId}
            initialWineMenu={initialWineMenu}
            isReadOnly={isReadOnly}
            restaurantName={initialInfo.name}
            logoUrl={initialInfo.logoUrl}
          />
        </section>
      )}

      {tab === "menus" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <SetMenusEditor
            restaurantId={restaurantId}
            initialSetMenus={initialSetMenus}
            initialMenu={initialMenu}
            isReadOnly={isReadOnly}
          />
        </section>
      )}

      {tab === "faqs" && (
        <section className="bg-[#111218] border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3">
          <FAQEditor
            restaurantId={restaurantId}
            initialFaqs={initialFaqs}
            isReadOnly={isReadOnly}
          />
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