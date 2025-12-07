export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTenantAndRestaurants } from "@/lib/getTenantAndRestaurants";

export default async function MobileMainMenu() {
  const { restaurants, currentRestaurantId } = await getTenantAndRestaurants();
  const currentRestaurant = restaurants.find(r => r.id === currentRestaurantId);

  const menuItems = [
    {
      href: "/m/reservas",
      title: "Gestión de Reservas",
      description: "Ver y gestionar las reservas del día",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      available: true,
    },
    {
      href: "#",
      title: "Comandas",
      description: "Gestión de pedidos y comandas",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      available: false,
    },
    {
      href: "#",
      title: "Mesas",
      description: "Gestión de mesas y zonas",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      available: false,
    },
  ];

  return (
    <div className="px-4 py-6">
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
          Bienvenido
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {currentRestaurant?.name || "Tu restaurante"}
        </p>
      </div>

      {/* Grid de opciones */}
      <div className="space-y-4">
        {menuItems.map((item) => (
          item.available ? (
            <Link
              key={item.title}
              href={item.href}
              className="block bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                    {item.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ) : (
            <div
              key={item.title}
              className="block bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 opacity-60"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-600">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-500 dark:text-zinc-500 mb-1">
                    {item.title}
                  </h2>
                  <p className="text-sm text-zinc-400 dark:text-zinc-600">
                    Próximamente
                  </p>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-10 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Servana · Gestión inteligente
        </p>
      </div>
    </div>
  );
}
