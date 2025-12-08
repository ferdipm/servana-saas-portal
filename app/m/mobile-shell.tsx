"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  tenantId: string;
  restaurantId: string;
  restaurantName: string;
  children: React.ReactNode;
};

export function MobileShell({ tenantId, restaurantId, restaurantName, children }: Props) {
  const pathname = usePathname();

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

          {/* Nombre restaurante - alineado derecha, destacado */}
          <div className="flex-1 min-w-0 text-right">
            <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {restaurantName}
            </span>
          </div>
        </div>
      </header>

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
