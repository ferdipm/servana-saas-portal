import { RestaurantSwitcher } from "@/components/RestaurantSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

import { Home, Settings, Clock3, BarChart3 } from "lucide-react";
import React from "react";
import { logout } from "./actions";

type Item = { href: string; label: string; icon: React.ReactElement };

const nav: Item[] = [
  { href: "/", label: "Reservas", icon: <Home className="w-4 h-4" /> },
  { href: "/pending", label: "Pendientes", icon: <Clock3 className="w-4 h-4" /> },
  { href: "/analytics", label: "Analíticas", icon: <BarChart3 className="w-4 h-4" /> },
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
  pendingCount = 0,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  restaurants?: any;
  currentRestaurantId?: string;
  canSwitch?: boolean;
  restaurantName?: string;
  restaurantLogoUrl?: string;
  pendingCount?: number;
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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-[#fafafa] dark:bg-[#0b0b0d] text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-[260px] bg-white dark:bg-[#1c1e24] border-r border-zinc-200 dark:border-white/5 flex flex-col">
        {/* Top logo */}
        <div className="px-5 pt-8 pb-6 border-b border-zinc-200 dark:border-white/5">
          {restaurantLogoUrl ? (
            <div className="h-10 w-40 rounded-md flex items-center justify-start overflow-hidden px-2">
              <img
                src={restaurantLogoUrl}
                alt={restaurantName || "Logo del restaurante"}
                className="max-h-10 max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="h-10 w-40 rounded-md bg-zinc-200 dark:bg-white/10"
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
                    text-zinc-600 dark:text-zinc-400
                    hover:text-zinc-900 dark:hover:text-zinc-100
                    hover:bg-zinc-100 dark:hover:bg-white/5
                    transition-colors
                  "
                >
                  <span className="shrink-0 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                    {n.icon}
                  </span>
                  <span className="text-[14px] leading-none flex-1">{n.label}</span>
                  {n.label === "Pendientes" && pendingCount > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Servana */}
        <div className="mt-auto px-5 py-4 border-t border-zinc-200 dark:border-white/5">
          <div className="text-xs text-zinc-400 dark:text-zinc-500">
            Powered by <span className="font-medium text-zinc-600 dark:text-zinc-400">Servana</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col">
        {/* Topbar - simplificado, solo controles de navegación */}
        <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800/60 backdrop-blur-xl bg-white/80 dark:bg-[#0b0b0d]/80">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-end gap-3">
            <ThemeToggle />
            <RestaurantSwitcher
              restaurants={restaurants}
              currentRestaurantId={currentRestaurantId}
              canSwitch={canSwitch}
            />
            {userEmail && (
              <div className="px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800/70 border border-zinc-300 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-200 max-w-[200px] truncate">
                {userEmail}
              </div>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="
                  px-3 py-1.5 rounded-full text-xs font-medium
                  border border-zinc-300 dark:border-zinc-600
                  bg-white dark:bg-zinc-900/70
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  text-zinc-700 dark:text-zinc-200
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
