import { RestaurantSwitcher } from "@/components/RestaurantSwitcher";

import { Home, Settings, Clock3 } from "lucide-react";
import React from "react";
import { logout } from "./actions";

type Item = { href: string; label: string; icon: React.ReactElement };

const nav: Item[] = [
  { href: "/", label: "Reservas", icon: <Home className="w-4 h-4" /> },
  { href: "/pending", label: "Pendientes", icon: <Clock3 className="w-4 h-4" /> },
  { href: "/settings", label: "Ajustes", icon: <Settings className="w-4 h-4" /> },
];

export default function DashboardShell({
  children,
  userEmail,
  restaurants,
  currentRestaurantId,
  canSwitch,
  restaurantName,
  restaurantLogoUrl,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  restaurants?: any;
  currentRestaurantId?: string;
  canSwitch?: boolean;
  restaurantName?: string;
  restaurantLogoUrl?: string;
}) {
  // Función helper para construir URLs con restaurantId
  const buildNavUrl = (href: string) => {
    if (href === "#") return href;
    if (!currentRestaurantId) return href;

    // Si hay múltiples restaurantes y canSwitch, agregar el query param
    if (canSwitch && restaurants && restaurants.length > 1) {
      return `${href}?restaurantId=${currentRestaurantId}`;
    }

    return href;
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-[#0b0b0d] text-zinc-100">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-[260px] bg-[#1c1e24] border-r border-white/5 flex flex-col">
        {/* Top logo */}
        <div className="px-5 pt-8 pb-6 border-b border-white/5">
          {restaurantLogoUrl ? (
            <div className="h-10 w-40 rounded-md flex items-center justify-start overflow-hidden">
              <img
                src={restaurantLogoUrl}
                alt={restaurantName || "Logo del restaurante"}
                className="max-h-10 max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="h-10 w-40 rounded-md bg-white/10"
              aria-label="Logo restaurante"
            />
          )}
          <div className="mt-2 text-[12px] text-zinc-500 truncate">
            {restaurantName || "Nombre del restaurante"}
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-8">
          <ul className="space-y-4">
            {nav.map((n) => (
              <li key={n.label}>
                <a
                  href={buildNavUrl(n.href)}
                  className="
                    group flex items-center gap-x-5
                    rounded-md px-3 py-2.5
                    text-zinc-400
                    hover:text-zinc-100 hover:bg-white/5
                    transition-colors
                  "
                >
                  <span className="shrink-0 text-zinc-400 group-hover:text-zinc-100">
                    {n.icon}
                  </span>
                  <span className="text-[14px] leading-none">{n.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bloque inferior - oculto en MVP */}
        {/* <div className="mt-auto p-4 text-xs text-zinc-500">
          <div className="rounded-xl p-3 bg-zinc-700/30 text-zinc-300">
            ¿App móvil? Próximamente.
          </div>
        </div> */}
      </aside>

      {/* Main */}
      <div className="flex flex-col">
        {/* Topbar - simplificado, solo controles de navegación */}
        <header className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-xl bg-[#0b0b0d]/80">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-end gap-3">
            <RestaurantSwitcher
              restaurants={restaurants}
              currentRestaurantId={currentRestaurantId}
              canSwitch={canSwitch}
            />
            {userEmail && (
              <div className="px-3 py-1.5 rounded-full bg-zinc-800/70 border border-zinc-700/60 text-xs text-zinc-200 max-w-[200px] truncate">
                {userEmail}
              </div>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="
                  px-3 py-1.5 rounded-full text-xs font-medium
                  border border-zinc-600
                  bg-zinc-900/70 hover:bg-zinc-800
                  text-zinc-200
                  transition-colors
                "
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        {/* Contenido */}
        <main className="max-w-7xl mx-auto w-full p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
