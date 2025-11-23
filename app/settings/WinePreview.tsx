"use client";

import { useState } from "react";

type Wine = {
  id: string;
  name: string;
  winery?: string;
  priceGlass?: number;
  priceBottle?: number;
};

type WineCategory = {
  id: string;
  name: string;
  wines: Wine[];
};

type PreviewTheme = "elegant" | "modern" | "classic" | "minimal";

type WinePreviewProps = {
  categories: WineCategory[];
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
  wineName: string;
  winery: string;
  price: string;
  priceHeader: string;
  accent: string;
  divider: string;
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
    wineName: "text-stone-800",
    winery: "text-stone-500",
    price: "text-amber-700",
    priceHeader: "text-stone-500",
    accent: "text-amber-600",
    divider: "border-stone-200",
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
    wineName: "text-slate-100",
    winery: "text-slate-400",
    price: "text-indigo-400",
    priceHeader: "text-slate-500",
    accent: "text-indigo-400",
    divider: "border-slate-700",
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
    wineName: "text-amber-900",
    winery: "text-amber-700/70",
    price: "text-amber-800",
    priceHeader: "text-amber-700/60",
    accent: "text-amber-700",
    divider: "border-amber-200",
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
    wineName: "text-zinc-900",
    winery: "text-zinc-500",
    price: "text-zinc-700",
    priceHeader: "text-zinc-400",
    accent: "text-zinc-600",
    divider: "border-zinc-200",
    font: "font-sans",
    titleFont: "font-sans",
  },
};

export function WinePreview({ categories, restaurantName, logoUrl }: WinePreviewProps) {
  const [theme, setTheme] = useState<PreviewTheme>("elegant");
  const t = themes[theme];

  const totalWines = categories.reduce((acc, cat) => acc + cat.wines.length, 0);

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
          {categories.length} categorías · {totalWines} vinos
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
                <span className="text-sm tracking-[0.3em]">🍷</span>
                <span className="w-16 h-px bg-current opacity-30"></span>
              </div>
            )}

            {/* Nombre del restaurante o título genérico */}
            <h1 className={`text-2xl md:text-3xl font-bold tracking-wider uppercase ${t.title} ${t.titleFont}`}>
              {restaurantName || "Carta de Vinos"}
            </h1>

            <p className={`mt-3 text-xs tracking-[0.25em] uppercase ${t.subtitle}`}>
              Carta de Vinos
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
                <p className={`${t.subtitle}`}>No hay vinos en la carta</p>
              </div>
            ) : (
              categories.map((category) => (
                <section key={category.id} className="space-y-5">
                  {/* Nombre de categoría */}
                  <div className="text-center">
                    <h2 className={`inline-block text-lg md:text-xl font-semibold tracking-widest uppercase pb-2 border-b-2 ${t.categoryBorder} ${t.category}`}>
                      {category.name}
                    </h2>
                  </div>

                  {/* Header de precios */}
                  <div className="flex items-center justify-end gap-6 pr-1">
                    <span className={`text-[10px] uppercase tracking-wider ${t.priceHeader}`}>
                      Copa
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider ${t.priceHeader}`}>
                      Botella
                    </span>
                  </div>

                  {/* Lista de vinos */}
                  <div className="space-y-3">
                    {category.wines.map((wine, idx) => (
                      <div
                        key={wine.id}
                        className={`group ${idx !== category.wines.length - 1 ? `border-b ${t.divider} pb-3` : ''}`}
                      >
                        {/* Nombre, bodega y precios */}
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm md:text-base font-semibold ${t.wineName}`}>
                              {wine.name}
                            </h3>
                            {wine.winery && (
                              <p className={`text-xs mt-0.5 ${t.winery}`}>
                                {wine.winery}
                              </p>
                            )}
                          </div>

                          {/* Precios en columnas */}
                          <div className="flex items-center gap-4 text-right shrink-0">
                            <span className={`w-14 text-sm font-medium ${t.price}`}>
                              {wine.priceGlass !== undefined && wine.priceGlass !== null
                                ? `${wine.priceGlass.toFixed(2)}€`
                                : "—"}
                            </span>
                            <span className={`w-16 text-sm font-bold ${t.price}`}>
                              {wine.priceBottle !== undefined && wine.priceBottle !== null
                                ? `${wine.priceBottle.toFixed(2)}€`
                                : "—"}
                            </span>
                          </div>
                        </div>
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
              Todos los precios incluyen IVA · Consulte nuestra selección de vinos por copas
            </p>
          </div>
        </div>
      </div>

      {/* Info sobre el preview */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 pt-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Esta vista previa muestra cómo se vería tu carta de vinos impresa o en una web</span>
      </div>
    </div>
  );
}
