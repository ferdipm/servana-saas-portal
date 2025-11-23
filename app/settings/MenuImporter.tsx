"use client";

import { useState, useRef, useCallback } from "react";

type MenuDish = {
  id: string;
  name: string;
  price?: number;
  description?: string;
  allergens?: string[];
};

type MenuCategory = {
  id: string;
  name: string;
  emoji: string;
  color?: string;
  dishes: MenuDish[];
};

type MenuImporterProps = {
  onImport: (categories: MenuCategory[]) => void;
  onCancel?: () => void;
  existingCategories?: MenuCategory[];
};

type ImportMethod = "file" | "url" | null;

// Emojis sugeridos para categorías
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  "entrante": "🥗",
  "entrada": "🥗",
  "ensalada": "🥗",
  "sopa": "🍜",
  "principal": "🍽️",
  "carne": "🥩",
  "pescado": "🐟",
  "marisco": "🦐",
  "pasta": "🍝",
  "arroz": "🍚",
  "postre": "🍰",
  "dulce": "🍮",
  "bebida": "🥤",
  "vino": "🍷",
  "cerveza": "🍺",
  "cafe": "☕",
  "desayuno": "🥐",
  "tapa": "🍢",
  "bocadillo": "🥪",
  "hamburguesa": "🍔",
  "pizza": "🍕",
  "vegano": "🌱",
  "vegetariano": "🥬",
  "infantil": "👶",
  "especial": "⭐",
};

// Colores sugeridos para categorías
const SUGGESTED_COLORS = [
  "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ef4444", "#14b8a6",
];

const getEmojiForCategory = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return "🍽️";
};

export function MenuImporter({ onImport, onCancel, existingCategories = [] }: MenuImporterProps) {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [includePrices, setIncludePrices] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingMenu = existingCategories.length > 0;

  // Combinar categorías nuevas con existentes
  const mergeCategories = (newCategories: MenuCategory[]): MenuCategory[] => {
    if (!appendMode || existingCategories.length === 0) {
      return newCategories;
    }

    const merged = [...existingCategories];

    for (const newCat of newCategories) {
      const existingCatIndex = merged.findIndex(
        (c) => c.name.toLowerCase().trim() === newCat.name.toLowerCase().trim()
      );

      if (existingCatIndex >= 0) {
        const existingDishNames = new Set(
          merged[existingCatIndex].dishes.map((d) => d.name.toLowerCase().trim())
        );
        const newDishes = newCat.dishes.filter(
          (d) => !existingDishNames.has(d.name.toLowerCase().trim())
        );
        merged[existingCatIndex].dishes = [
          ...merged[existingCatIndex].dishes,
          ...newDishes,
        ];
      } else {
        merged.push(newCat);
      }
    }

    return merged;
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        setError(`Formato no soportado: ${file.name}. Usa PDF, JPG o PNG.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`Archivo demasiado grande: ${file.name}. Maximo 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Transformar respuesta del API a estructura de menú
  const transformToMenuCategories = (menuData: any): MenuCategory[] => {
    if (!menuData?.categories) return [];

    return menuData.categories.map((cat: any, catIndex: number) => {
      const categoryName = cat.name || "Sin categoria";

      return {
        id: `cat-${Date.now()}-${catIndex}`,
        name: categoryName,
        emoji: getEmojiForCategory(categoryName),
        color: SUGGESTED_COLORS[catIndex % SUGGESTED_COLORS.length],
        dishes: (cat.dishes || []).map((dish: any, dishIndex: number) => ({
          id: `dish-${Date.now()}-${catIndex}-${dishIndex}`,
          name: dish.name || "",
          price: dish.price || undefined,
          description: dish.description || undefined,
          allergens: dish.allergens || [],
        })),
      };
    });
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      let allCategories: MenuCategory[] = [];

      // Procesar cada archivo
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("menu", file);
        formData.append("includePrices", includePrices ? "true" : "false");

        const response = await fetch("/api/import-menu", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error procesando ${file.name}`);
        }

        const data = await response.json();
        const menuData = data.processedMenu || data;
        const categories = transformToMenuCategories(menuData);

        // Combinar con categorías ya procesadas
        for (const newCat of categories) {
          const existingIdx = allCategories.findIndex(
            c => c.name.toLowerCase().trim() === newCat.name.toLowerCase().trim()
          );
          if (existingIdx >= 0) {
            // Añadir platos a categoría existente
            const existingDishNames = new Set(
              allCategories[existingIdx].dishes.map(d => d.name.toLowerCase().trim())
            );
            const newDishes = newCat.dishes.filter(
              d => !existingDishNames.has(d.name.toLowerCase().trim())
            );
            allCategories[existingIdx].dishes.push(...newDishes);
          } else {
            allCategories.push(newCat);
          }
        }
      }

      if (allCategories.length === 0) {
        throw new Error("No se pudieron extraer platos de los archivos");
      }

      const finalCategories = mergeCategories(allCategories);
      onImport(finalCategories);
    } catch (err: any) {
      setError(err.message || "Error al procesar los archivos");
    } finally {
      setIsProcessing(false);
    }
  };

  const processUrl = async () => {
    if (!url.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/import-menu-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), includePrices }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error procesando la URL");
      }

      const data = await response.json();
      const menuData = data.processedMenu || data;
      const categories = transformToMenuCategories(menuData);

      if (categories.length === 0) {
        throw new Error("No se pudieron extraer platos de la URL");
      }

      const finalCategories = mergeCategories(categories);
      onImport(finalCategories);
    } catch (err: any) {
      setError(err.message || "Error al procesar la URL");
    } finally {
      setIsProcessing(false);
    }
  };

  // Vista inicial: selección de método
  if (!method) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/30 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            Importar carta
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Sube tu carta en PDF o imagen, o proporciona la URL de tu web.
            Nuestra IA extraera automaticamente los platos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Opción: Archivo */}
          <button
            type="button"
            onClick={() => setMethod("file")}
            className="group p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-indigo-500 bg-zinc-900/50 hover:bg-indigo-950/20 transition-all text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-900/30 border border-indigo-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-zinc-100 mb-1">Subir archivos</h4>
                <p className="text-xs text-zinc-500">PDF, JPG o PNG (multiples archivos)</p>
              </div>
            </div>
          </button>

          {/* Opción: URL */}
          <button
            type="button"
            onClick={() => setMethod("url")}
            className="group p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-indigo-500 bg-zinc-900/50 hover:bg-indigo-950/20 transition-all text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-900/30 border border-indigo-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-zinc-100 mb-1">Desde URL</h4>
                <p className="text-xs text-zinc-500">Enlace a tu carta online</p>
              </div>
            </div>
          </button>
        </div>

        {/* Opciones de importación */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {/* Toggle para incluir precios */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={includePrices}
                onChange={(e) => setIncludePrices(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
              Importar precios
            </span>
          </label>

          {/* Toggle para modo añadir */}
          {hasExistingMenu && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={appendMode}
                  onChange={(e) => setAppendMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
              <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                Anadir a carta existente
              </span>
              <span className="text-xs text-zinc-500">
                ({existingCategories.reduce((acc, cat) => acc + cat.dishes.length, 0)} platos)
              </span>
            </label>
          )}
        </div>

        {onCancel && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              O anade los platos manualmente
            </button>
          </div>
        )}
      </div>
    );
  }

  // Vista: Subir archivo(s)
  if (method === "file") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setMethod(null);
              setSelectedFiles([]);
              setError(null);
            }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h3 className="text-sm font-medium text-zinc-300">Subir archivos</h3>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-indigo-500 bg-indigo-950/30"
              : selectedFiles.length > 0
              ? "border-emerald-500/50 bg-emerald-950/20"
              : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files);
              }
            }}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-indigo-400">Haz clic para seleccionar</span> o arrastra aqui
              </p>
              <p className="text-xs text-zinc-500 mt-1">PDF, JPG o PNG (max. 10MB cada uno) - Puedes subir varios archivos</p>
            </div>
          </div>
        </div>

        {/* Lista de archivos seleccionados */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">{selectedFiles.length} archivo(s) seleccionado(s):</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center">
                      {file.type === "application/pdf" ? (
                        <span className="text-xs">PDF</span>
                      ) : (
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={processFiles}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </>
            ) : (
              `Importar ${selectedFiles.length > 1 ? `${selectedFiles.length} archivos` : "carta"}`
            )}
          </button>
        </div>
      </div>
    );
  }

  // Vista: URL
  if (method === "url") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setMethod(null);
              setUrl("");
              setError(null);
            }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h3 className="text-sm font-medium text-zinc-300">Importar desde URL</h3>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm text-zinc-400">
            URL de tu carta
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://turestaurante.com/carta"
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Introduce la URL donde aparece tu carta. Nuestra IA extraera automaticamente la informacion.
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={processUrl}
            disabled={!url.trim() || isProcessing}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </>
            ) : (
              "Importar carta"
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
