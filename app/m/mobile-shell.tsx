"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  tenantId: string;
  restaurantId: string;
  restaurantName: string;
  children: React.ReactNode;
};

export function MobileShell({ tenantId, restaurantId, restaurantName, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  // Ir a vista desktop y recordar preferencia
  function goToDesktop() {
    // Setear cookie para no ser redirigido automáticamente (expira en 24h)
    document.cookie = "prefer-desktop=true; path=/; max-age=86400";
    router.push("/");
  }

  const navItems = [
    {
      href: "/m",
      label: "Hoy",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      isActive: pathname === "/m",
    },
    {
      href: "/m/pending",
      label: "Pendientes",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      isActive: pathname === "/m/pending",
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
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {restaurantName}
          </h1>
          <button
            onClick={goToDesktop}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Vista completa
          </button>
        </div>
      </header>

      {/* Contenido principal - scrollable */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation fija */}
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
    </div>
  );
}
