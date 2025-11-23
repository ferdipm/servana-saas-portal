"use client";

import { useState, useRef, useCallback } from "react";

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

type WineImporterProps = {
  onImport: (categories: WineCategory[]) => void;
  onCancel?: () => void;
};

type ImportMethod = "file" | "url" | null;

export function WineImporter({ onImport, onCancel }: WineImporterProps) {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Formato no soportado. Usa PDF, JPG o PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Transformar respuesta del API de menú a estructura de vinos
  const transformMenuToWineCategories = (menuData: any): WineCategory[] => {
    if (!menuData?.categories) return [];

    return menuData.categories.map((cat: any, catIndex: number) => ({
      id: `winecat-${Date.now()}-${catIndex}`,
      name: cat.name || "Sin categoría",
      wines: (cat.dishes || []).map((dish: any, dishIndex: number) => ({
        id: `wine-${Date.now()}-${catIndex}-${dishIndex}`,
        name: dish.name || "",
        winery: dish.description || undefined, // Usamos descripción como bodega
        priceBottle: dish.price || undefined,
        priceGlass: undefined, // El API de menú no tiene precio por copa
      })),
    }));
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("menu", selectedFile);

      const response = await fetch("/api/import-menu", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error procesando el archivo");
      }

      const data = await response.json();
      const wineCategories = transformMenuToWineCategories(data);

      if (wineCategories.length === 0) {
        throw new Error("No se pudieron extraer vinos del archivo");
      }

      onImport(wineCategories);
    } catch (err: any) {
      setError(err.message || "Error al procesar el archivo");
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
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error procesando la URL");
      }

      const data = await response.json();
      const wineCategories = transformMenuToWineCategories(data);

      if (wineCategories.length === 0) {
        throw new Error("No se pudieron extraer vinos de la URL");
      }

      onImport(wineCategories);
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
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            Importar carta de vinos
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Sube tu carta de vinos en PDF o imagen, o proporciona la URL de tu web
            donde aparece. Nuestra IA extraerá automáticamente los vinos.
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
                <h4 className="font-medium text-zinc-100 mb-1">Subir archivo</h4>
                <p className="text-xs text-zinc-500">PDF, JPG o PNG de tu carta de vinos</p>
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
                <p className="text-xs text-zinc-500">Enlace a tu carta de vinos online</p>
              </div>
            </div>
          </button>
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
              setSelectedFile(null);
              setError(null);
            }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h3 className="text-sm font-medium text-zinc-300">Subir archivo</h3>
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
              : selectedFile
              ? "border-emerald-500/50 bg-emerald-950/20"
              : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-xl bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">{selectedFile.name}</p>
                <p className="text-xs text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-300">
                  <span className="font-medium text-indigo-400">Haz clic para seleccionar</span> o arrastra aquí
                </p>
                <p className="text-xs text-zinc-500 mt-1">PDF, JPG o PNG (máx. 10MB)</p>
              </div>
            </div>
          )}
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
            onClick={processFile}
            disabled={!selectedFile || isProcessing}
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
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
