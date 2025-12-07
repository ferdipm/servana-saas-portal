"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";

type Restaurant = {
  id: string;
  name: string;
  slug?: string | null;
};

type RestaurantSwitcherProps = {
  restaurants?: Restaurant[];
  currentRestaurantId?: string;
  canSwitch?: boolean;
};

export function RestaurantSwitcher({
  restaurants = [],
  currentRestaurantId,
  canSwitch = false,
}: RestaurantSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (!restaurants.length || !currentRestaurantId) {
    return null;
  }

  const current =
    restaurants.find((r) => r.id === currentRestaurantId) ?? restaurants[0];

  // Caso: solo un restaurante o el usuario no puede cambiar → solo texto
  if (!canSwitch || restaurants.length <= 1) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Restaurante:{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-100">{current.name}</span>
      </div>
    );
  }

  const handleChange = (newId: string) => {
    const params = new URLSearchParams(searchParams?.toString());

    if (newId) {
      params.set("restaurantId", newId);
    } else {
      params.delete("restaurantId");
    }

    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;

    // Usar router.push + router.refresh para navegación rápida sin recarga completa
    router.push(href);
    router.refresh(); // Fuerza re-fetch del Server Component
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Restaurante:</span>
      <select
        className="border border-zinc-300 dark:border-zinc-700/70 rounded-md px-2 py-1 bg-white dark:bg-[#1c1e24] text-sm text-zinc-800 dark:text-zinc-100"
        value={current.id}
        onChange={(e) => handleChange(e.target.value)}
      >
        {restaurants.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </div>
  );
}