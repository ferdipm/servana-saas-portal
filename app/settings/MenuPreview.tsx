"use client";

import { useState } from "react";

type MenuDish = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  allergens?: string[];
  notes?: string;
};

type MenuCategory = {
  id: string;
  name: string;
  emoji: string;
  color?: string;
  dishes: MenuDish[];
};

type PreviewTheme = "elegant" | "modern" | "classic" | "minimal";

type MenuPreviewProps = {
  categories: MenuCategory[];
  restaurantName?: string;
  logoUrl?: string;
};

// Configuración de temas
const themes: Record<PreviewTheme, {
  name: string;
  bg: string;
  paper: string;
  title: string;
  subtitle: string;
  category: string;
  categoryBorder: string;
  dishName: string;
  dishDesc: string;
  price: string;
  accent: string;
  allergen: string;
  notes: string;
  font: string;
  titleFont: string;
}> = {
  elegant: {
    name: "Elegante",
    bg: "bg-gradient-to-br from-stone-100 to-amber-50",
    paper: "bg-white shadow-2xl",
    title: "text-stone-800",
    subtitle: "text-stone-500",
    category: "text-stone-800",
    categoryBorder: "border-amber-400",
    dishName: "text-stone-800",
    dishDesc: "text-stone-600",
    price: "text-amber-700",
    accent: "text-amber-600",
    allergen: "bg-amber-50 text-amber-700 border-amber-200",
    notes: "text-stone-500",
    font: "font-serif",
    titleFont: "font-serif",
  },
  modern: {
    name: "Moderno",
    bg: "bg-gradient-to-br from-slate-900 to-slate-800",
    paper: "bg-slate-900/80 backdrop-blur border border-slate-700",
    title: "text-white",
    subtitle: "text-slate-400",
    category: "text-white",
    categoryBorder: "border-indigo-500",
    dishName: "text-slate-100",
    dishDesc: "text-slate-400",
    price: "text-indigo-400",
    accent: "text-indigo-400",
    allergen: "bg-slate-800 text-slate-300 border-slate-600",
    notes: "text-slate-500",
    font: "font-sans",
    titleFont: "font-sans",
  },
  classic: {
    name: "Clásico",
    bg: "bg-gradient-to-b from-amber-50 to-orange-50",
    paper: "bg-[#faf6f0] shadow-xl border-2 border-amber-200",
    title: "text-amber-900",
    subtitle: "text-amber-700",
    category: "text-amber-900",
    categoryBorder: "border-amber-600",
    dishName: "text-amber-900",
    dishDesc: "text-amber-800/70",
    price: "text-amber-800",
    accent: "text-amber-700",
    allergen: "bg-amber-100 text-amber-800 border-amber-300",
    notes: "text-amber-700/60",
    font: "font-serif",
    titleFont: "font-serif",
  },
  minimal: {
    name: "Minimalista",
    bg: "bg-white",
    paper: "bg-white",
    title: "text-zinc-900",
    subtitle: "text-zinc-500",
    category: "text-zinc-900",
    categoryBorder: "border-zinc-300",
    dishName: "text-zinc-900",
    dishDesc: "text-zinc-500",
    price: "text-zinc-700",
    accent: "text-zinc-600",
    allergen: "bg-zinc-100 text-zinc-600 border-zinc-200",
    notes: "text-zinc-400",
    font: "font-sans",
    titleFont: "font-sans",
  },
};

export function MenuPreview({ categories, restaurantName, logoUrl }: MenuPreviewProps) {
  const [theme, setTheme] = useState<PreviewTheme>("elegant");
  const t = themes[theme];

  const totalDishes = categories.reduce((acc, cat) => acc + cat.dishes.length, 0);

  return (
    <div className="space-y-4">
      {/* Selector de tema */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Estilo:</span>
          <div className="flex gap-1">
            {(Object.keys(themes) as PreviewTheme[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  theme === key
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {themes[key].name}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          {categories.length} categorías · {totalDishes} platos
        </div>
      </div>

      {/* Preview Container */}
      <div className={`${t.bg} rounded-2xl p-6 md:p-10 min-h-[600px]`}>
        <div className={`${t.paper} rounded-xl max-w-2xl mx-auto overflow-hidden`}>
          {/* Header del menú */}
          <div className="p-8 md:p-12 text-center border-b border-current/10">
            {/* Logo del restaurante */}
            {logoUrl ? (
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-900 p-2 shadow-lg ring-2 ring-zinc-700/50">
                  <img
                    src={logoUrl}
                    alt={restaurantName || "Logo"}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              </div>
            ) : (
              /* Decoración superior si no hay logo */
              <div className={`flex items-center justify-center gap-3 mb-6 ${t.accent}`}>
                <span className="w-16 h-px bg-current opacity-30"></span>
                <span className="text-sm tracking-[0.3em]">※</span>
                <span className="w-16 h-px bg-current opacity-30"></span>
              </div>
            )}

            {/* Nombre del restaurante o título genérico */}
            <h1 className={`text-2xl md:text-3xl font-bold tracking-wider uppercase ${t.title} ${t.titleFont}`}>
              {restaurantName || "Nuestra Carta"}
            </h1>

            <p className={`mt-3 text-xs tracking-[0.25em] uppercase ${t.subtitle}`}>
              Carta
            </p>

            {/* Decoración inferior */}
            <div className={`flex items-center justify-center gap-4 mt-5 ${t.accent}`}>
              <span className="w-12 h-px bg-current opacity-30"></span>
              <span className="text-[10px] tracking-widest">❖</span>
              <span className="w-12 h-px bg-current opacity-30"></span>
            </div>
          </div>

          {/* Contenido del menú */}
          <div className={`p-6 md:p-10 space-y-10 ${t.font}`}>
            {categories.length === 0 ? (
              <div className="text-center py-16">
                <p className={`${t.subtitle}`}>No hay platos en el menú</p>
              </div>
            ) : (
              categories.map((category) => (
                <section key={category.id} className="space-y-5">
                  {/* Nombre de categoría - sin emoji, solo texto elegante */}
                  <div className="text-center">
                    <h2 className={`inline-block text-lg md:text-xl font-semibold tracking-widest uppercase pb-2 border-b-2 ${t.categoryBorder} ${t.category}`}>
                      {category.name}
                    </h2>
                  </div>

                  {/* Lista de platos */}
                  <div className="space-y-4">
                    {category.dishes.map((dish) => (
                      <div key={dish.id} className="group">
                        {/* Nombre y precio */}
                        <div className="flex items-baseline gap-2">
                          <h3 className={`text-sm md:text-base font-semibold ${t.dishName}`}>
                            {dish.name}
                          </h3>
                          <span className="flex-1 border-b border-dotted border-current/20"></span>
                          {dish.price !== undefined && dish.price !== null && (
                            <span className={`text-sm md:text-base font-bold ${t.price}`}>
                              {dish.price.toFixed(2)}€
                            </span>
                          )}
                        </div>

                        {/* Descripción */}
                        {dish.description && (
                          <p className={`mt-1 text-xs md:text-sm leading-relaxed ${t.dishDesc}`}>
                            {dish.description}
                          </p>
                        )}

                        {/* Notas del chef */}
                        {dish.notes && (
                          <p className={`mt-1.5 text-[11px] italic ${t.notes}`}>
                            {dish.notes}
                          </p>
                        )}

                        {/* Alérgenos */}
                        {dish.allergens && dish.allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {dish.allergens.map((allergen) => (
                              <span
                                key={allergen}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] border ${t.allergen}`}
                              >
                                {allergen}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* Footer del menú */}
          <div className={`p-6 text-center border-t border-current/10 ${t.subtitle}`}>
            <p className="text-[9px] md:text-[10px] tracking-wider uppercase">
              Todos los precios incluyen IVA · Consulte alérgenos con nuestro personal
            </p>
          </div>
        </div>
      </div>

      {/* Info sobre el preview */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 pt-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Esta vista previa muestra cómo se vería tu carta impresa o en una web</span>
      </div>
    </div>
  );
}
