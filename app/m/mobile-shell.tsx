"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

type Restaurant = {
  id: string;
  name: string;
  slug?: string | null;
};

type Props = {
  tenantId: string;
  restaurantId: string;
  restaurantName: string;
  restaurants?: Restaurant[];
  canSwitch?: boolean;
  children: React.ReactNode;
};

export function MobileShell({ tenantId, restaurantId, restaurantName, restaurants = [], canSwitch = false, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Lógica para cambiar de restaurante
  const handleRestaurantChange = (newId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (newId) {
      params.set("restaurantId", newId);
    } else {
      params.delete("restaurantId");
    }
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.push(href);
    router.refresh();
    setShowSwitcher(false);
  };

  const hasMultipleRestaurants = canSwitch && restaurants.length > 1;

  // Determinar si estamos en el menú principal
  const isMainMenu = pathname === "/m";
  const isReservations = pathname === "/m/reservas" || pathname === "/m/reservas/pending";
  const isScan = pathname === "/m/scan";
  const showBottomNav = isReservations || isScan;

  const navItems = [
    {
      href: "/m/reservas",
      label: "Reservas Hoy",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      isActive: pathname === "/m/reservas",
    },
    {
      href: "/m/scan",
      label: "Escanear",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      isActive: pathname === "/m/scan",
    },
    {
      href: "/m/reservas/pending",
      label: "Pendientes",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      isActive: pathname === "/m/reservas/pending",
    },
  ];

  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0c] flex flex-col"
      data-tenant={tenantId}
      data-restaurant={restaurantId}
    >
      {/* Header fijo */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Icono menú principal (solo si no estamos en el menú) */}
          {!isMainMenu && (
            <Link
              href="/m"
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Link>
          )}

          {/* Logo */}
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            Servana
          </span>

          {/* Nombre restaurante - con selector si hay múltiples */}
          <div className="flex-1 min-w-0 text-right">
            {hasMultipleRestaurants ? (
              <button
                onClick={() => setShowSwitcher(true)}
                className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-800 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <span className="truncate max-w-[140px]">{restaurantName}</span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </button>
            ) : (
              <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                {restaurantName}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Modal selector de restaurante */}
      {showSwitcher && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowSwitcher(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[60vh] overflow-auto safe-area-bottom animate-slide-up">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto" />
            </div>
            <div className="px-5 pb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Cambiar restaurante
              </h3>
              <div className="space-y-2">
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRestaurantChange(r.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      r.id === restaurantId
                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.name}</span>
                      {r.id === restaurantId && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Contenido principal - el scroll se maneja dentro de cada componente hijo */}
      <main className="flex-1 min-h-0 pb-20 relative">
        {children}
      </main>

      {/* Bottom navigation fija (en vistas de reservas y scan) */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 safe-area-bottom">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-lg transition-colors
                  ${item.isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }
                `}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
