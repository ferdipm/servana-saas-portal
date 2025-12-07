"use client";

import { useState, useRef, useCallback } from "react";

type Wine = {
  id: string;
  name: string;
  winery?: string;
  origin?: string;
  priceGlass?: number;
  priceBottle?: number;
};

type WineCategory = {
  id: string;
  name: string;
  wines: Wine[];
};

type WineImporterProps = {
  onImport: (categories: WineCategory[]) => void;
  onCancel?: () => void;
  existingCategories?: WineCategory[]; // Para modo "añadir"
};

type ImportMethod = "file" | "url" | null;

export function WineImporter({ onImport, onCancel, existingCategories = [] }: WineImporterProps) {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [appendMode, setAppendMode] = useState(false); // Añadir vs reemplazar
  const [includePrices, setIncludePrices] = useState(true); // Por defecto SÍ para vinos
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingWines = existingCategories.length > 0;

  // Combinar categorías nuevas con existentes
  const mergeCategories = (newCategories: WineCategory[]): WineCategory[] => {
    if (!appendMode || existingCategories.length === 0) {
      return newCategories;
    }

    const merged = [...existingCategories];

    for (const newCat of newCategories) {
      // Buscar si existe una categoría con nombre similar
      const existingCatIndex = merged.findIndex(
        (c) => c.name.toLowerCase().trim() === newCat.name.toLowerCase().trim()
      );

      if (existingCatIndex >= 0) {
        // Añadir vinos a la categoría existente (evitando duplicados por nombre)
        const existingWineNames = new Set(
          merged[existingCatIndex].wines.map((w) => w.name.toLowerCase().trim())
        );
        const newWines = newCat.wines.filter(
          (w) => !existingWineNames.has(w.name.toLowerCase().trim())
        );
        merged[existingCatIndex].wines = [
          ...merged[existingCatIndex].wines,
          ...newWines,
        ];
      } else {
        // Añadir la categoría completa
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

  // Extraer denominación de origen del nombre de la categoría
  // Ej: "Vinos Tintos D.O. Ribera del Duero" -> "Ribera del Duero"
  // Ej: "Vinos Blancos Gallegos" -> "Galicia"
  const extractOriginFromCategoryName = (categoryName: string): string | undefined => {
    const name = categoryName.toLowerCase();

    // Patrones comunes de D.O.
    const doPatterns = [
      /d\.?o\.?\s+(.+)$/i,           // "D.O. Ribera del Duero" -> "Ribera del Duero"
      /denominaci[oó]n\s+(.+)$/i,    // "Denominación Ribera del Duero"
    ];

    for (const pattern of doPatterns) {
      const match = categoryName.match(pattern);
      if (match) return match[1].trim();
    }

    // Mapeo de regiones conocidas
    const regionMappings: Record<string, string> = {
      "gallegos": "Galicia",
      "galicia": "Galicia",
      "rioja": "Rioja",
      "ribera": "Ribera del Duero",
      "rueda": "Rueda",
      "priorat": "Priorat",
      "penedès": "Penedès",
      "penedes": "Penedès",
      "navarra": "Navarra",
      "bierzo": "Bierzo",
      "toro": "Toro",
      "jumilla": "Jumilla",
      "rías baixas": "Rías Baixas",
      "rias baixas": "Rías Baixas",
      "monterrei": "Monterrei",
      "valdeorras": "Valdeorras",
      "ribeiro": "Ribeiro",
      "cava": "Cava",
      "champagne": "Champagne",
      "borgoña": "Borgoña",
      "burdeos": "Burdeos",
      "italia": "Italia",
      "francia": "Francia",
      "portugal": "Portugal",
      "argentina": "Argentina",
      "chile": "Chile",
    };

    for (const [key, value] of Object.entries(regionMappings)) {
      if (name.includes(key)) return value;
    }

    return undefined;
  };

  // Extraer D.O. del campo description del backend
  // Ej: "D.O. RIAS BAIXAS" -> "Rías Baixas"
  // Ej: "D.O. MONTERREI" -> "Monterrei"
  const extractOriginFromDescription = (description: string): string | undefined => {
    if (!description) return undefined;

    // Limpiar y normalizar
    const cleaned = description.trim();

    // Si empieza con D.O., extraer el resto
    const doMatch = cleaned.match(/^d\.?o\.?\s+(.+)$/i);
    if (doMatch) {
      // Capitalizar correctamente
      const origin = doMatch[1].trim();
      return capitalizeOrigin(origin);
    }

    // Si es solo el nombre de una región conocida
    return capitalizeOrigin(cleaned);
  };

  // Capitalizar nombres de origen correctamente
  const capitalizeOrigin = (origin: string): string => {
    const specialCases: Record<string, string> = {
      "rias baixas": "Rías Baixas",
      "ribera del duero": "Ribera del Duero",
      "castilla - león": "Castilla y León",
      "castilla y leon": "Castilla y León",
      "la rioja": "Rioja",
    };

    const lower = origin.toLowerCase();
    if (specialCases[lower]) return specialCases[lower];

    // Capitalizar cada palabra
    return origin
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Transformar respuesta del API de menú a estructura de vinos
  const transformMenuToWineCategories = (menuData: any): WineCategory[] => {
    if (!menuData?.categories) return [];

    return menuData.categories.map((cat: any, catIndex: number) => {
      const categoryName = cat.name || "Sin categoría";
      const origin = extractOriginFromCategoryName(categoryName);

      return {
        id: `winecat-${Date.now()}-${catIndex}`,
        name: categoryName,
        wines: (cat.dishes || []).map((dish: any, dishIndex: number) => {
          // El backend puede devolver la D.O. en description (ej: "D.O. RIAS BAIXAS")
          const descriptionOrigin = dish.description
            ? extractOriginFromDescription(dish.description)
            : undefined;

          return {
            id: `wine-${Date.now()}-${catIndex}-${dishIndex}`,
            name: dish.name || "",
            winery: undefined, // El backend no devuelve bodega separada
            origin: descriptionOrigin || origin, // Preferir origen del vino, luego de categoría
            priceBottle: dish.price || undefined,
            priceGlass: undefined,
          };
        }),
      };
    });
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      let allCategories: WineCategory[] = [];

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
        const wineCategories = transformMenuToWineCategories(menuData);

        // Combinar con categorías ya procesadas
        for (const newCat of wineCategories) {
          const existingIdx = allCategories.findIndex(
            c => c.name.toLowerCase().trim() === newCat.name.toLowerCase().trim()
          );
          if (existingIdx >= 0) {
            // Añadir vinos a categoría existente (evitando duplicados)
            const existingWineNames = new Set(
              allCategories[existingIdx].wines.map(w => w.name.toLowerCase().trim())
            );
            const newWines = newCat.wines.filter(
              w => !existingWineNames.has(w.name.toLowerCase().trim())
            );
            allCategories[existingIdx].wines.push(...newWines);
          } else {
            allCategories.push(newCat);
          }
        }
      }

      if (allCategories.length === 0) {
        throw new Error("No se pudieron extraer vinos de los archivos");
      }

      // Si está en modo añadir, combinar con existentes
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
      // El backend devuelve { processedMenu: { categories: [...] } }
      const menuData = data.processedMenu || data;
      const wineCategories = transformMenuToWineCategories(menuData);

      if (wineCategories.length === 0) {
        throw new Error("No se pudieron extraer vinos de la URL");
      }

      // Si está en modo añadir, combinar con existentes
      const finalCategories = mergeCategories(wineCategories);
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
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-700/30 flex items-center justify-center">
            <span className="text-4xl">🍷</span>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Importar carta de vinos
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Sube tu carta de vinos en PDF o imagen, o proporciona la URL de tu web
            donde aparece. Nuestra IA extraerá automáticamente los vinos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Opción: Archivo */}
          <button
            type="button"
            onClick={() => setMethod("file")}
            className="group p-6 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 bg-white dark:bg-zinc-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-left shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Subir archivo</h4>
                <p className="text-xs text-zinc-500">PDF, JPG o PNG de tu carta de vinos</p>
              </div>
            </div>
          </button>

          {/* Opción: URL */}
          <button
            type="button"
            onClick={() => setMethod("url")}
            className="group p-6 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 bg-white dark:bg-zinc-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-left shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Desde URL</h4>
                <p className="text-xs text-zinc-500">Enlace a tu carta de vinos online</p>
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
              <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
              Importar precios
            </span>
          </label>

          {/* Toggle para modo añadir (solo si hay vinos existentes) */}
          {hasExistingWines && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={appendMode}
                  onChange={(e) => setAppendMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                Añadir a carta existente
              </span>
              <span className="text-xs text-zinc-500">
                ({existingCategories.reduce((acc, cat) => acc + cat.wines.length, 0)} vinos)
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
              O añade los vinos manualmente
            </button>
          </div>
        )}
      </div>
    );
  }

  // Vista: Subir archivo
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
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subir archivo</h3>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-sm text-rose-700 dark:text-rose-300">
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
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
              : selectedFiles.length > 0
              ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20"
              : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/50"
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
            <div className="w-16 h-16 mx-auto rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">Haz clic para seleccionar</span> o arrastra aqui
              </p>
              <p className="text-xs text-zinc-500 mt-1">PDF, JPG o PNG (max. 10MB) - Puedes subir varios archivos</p>
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
                      <p className="text-sm text-zinc-700 dark:text-zinc-200 truncate max-w-[200px]">{file.name}</p>
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
              `Importar ${selectedFiles.length > 1 ? `${selectedFiles.length} archivos` : "vinos"}`
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
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Importar desde URL</h3>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">
            URL de tu carta de vinos
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
              placeholder="https://turestaurante.com/carta-vinos"
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Introduce la URL donde aparece tu carta de vinos. Nuestra IA extraerá automáticamente la información.
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
              "Importar vinos"
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
