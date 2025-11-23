"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { updateWineMenu } from "./actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WinePreview } from "./WinePreview";
import { WineImporter } from "./WineImporter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types for wine menu
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

type WineEditorProps = {
  restaurantId: string;
  initialWineMenu: any;
  isReadOnly: boolean;
  restaurantName?: string;
  logoUrl?: string;
};

type ViewMode = "edit" | "preview";

// Sortable Wine component
function SortableWine({
  wine,
  onEdit,
  onDelete,
  isReadOnly,
}: {
  wine: Wine;
  onEdit: () => void;
  onDelete: () => void;
  isReadOnly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wine.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-2.5 hover:bg-zinc-900/40 hover:border-zinc-700/60 transition-colors"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {!isReadOnly && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 mt-1.5"
            aria-label="Arrastrar vino"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
            </svg>
          </button>
        )}

        <div className="flex-1 space-y-1">
          {/* Name and prices */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <span className="text-sm font-medium text-zinc-100">{wine.name}</span>
              {wine.winery && (
                <span className="text-xs text-zinc-500 ml-2">({wine.winery})</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {wine.priceGlass !== undefined && wine.priceGlass !== null && (
                <span className="text-amber-400">
                  <span className="text-[10px] text-zinc-500 mr-0.5">Copa</span>
                  {wine.priceGlass.toFixed(2)}€
                </span>
              )}
              {wine.priceBottle !== undefined && wine.priceBottle !== null && (
                <span className="text-emerald-400 font-medium">
                  <span className="text-[10px] text-zinc-500 mr-0.5">Bot.</span>
                  {wine.priceBottle.toFixed(2)}€
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onEdit}
              disabled={isReadOnly}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              title="Editar vino"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isReadOnly}
              className="text-[10px] text-rose-500 hover:text-rose-300 disabled:opacity-50"
              title="Eliminar vino"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sortable Category component
function SortableCategory({
  category,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  children,
  isReadOnly,
}: {
  category: WineCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
  isReadOnly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-zinc-900/40 border border-zinc-800 rounded-lg"
    >
      {/* Category Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors bg-[#0b0b0d]/95 backdrop-blur-sm border-b border-zinc-800/50 rounded-t-lg">
        <div className="flex items-center gap-3 flex-1">
          {/* Drag handle */}
          {!isReadOnly && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300"
              aria-label="Arrastrar categoria"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
              </svg>
            </button>
          )}

          {/* Wine icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer bg-purple-900/30 border border-purple-700"
            onClick={onToggle}
          >
            🍷
          </div>

          {/* Name */}
          <div className="cursor-pointer flex-1" onClick={onToggle}>
            <div className="font-medium text-zinc-100">{category.name}</div>
            <div className="text-xs text-zinc-500">
              {category.wines.length} vino{category.wines.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit button */}
          <button
            type="button"
            onClick={onEdit}
            disabled={isReadOnly}
            className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
          >
            Editar
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={onDelete}
            disabled={isReadOnly}
            className="px-2 py-1 text-xs rounded bg-rose-900/50 hover:bg-rose-900 text-rose-200 disabled:opacity-50"
          >
            Eliminar
          </button>

          {/* Expand/collapse icon */}
          <button onClick={onToggle} className="text-zinc-400 ml-2">
            {isExpanded ? "▼" : "▶"}
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="max-h-[600px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

export function WineEditor({ restaurantId, initialWineMenu, isReadOnly, restaurantName, logoUrl }: WineEditorProps) {
  // Parse initial wine menu
  const parseInitialWineMenu = (): WineCategory[] => {
    if (!initialWineMenu || !initialWineMenu.categories || !Array.isArray(initialWineMenu.categories)) {
      return [];
    }

    return initialWineMenu.categories.map((cat: any, index: number) => ({
      id: cat.id || `winecat-${Date.now()}-${index}`,
      name: cat.name || "Sin nombre",
      wines: (cat.wines || []).map((wine: any, wineIndex: number) => ({
        id: wine.id || `wine-${Date.now()}-${wineIndex}`,
        name: wine.name || "",
        winery: wine.winery || "",
        priceGlass: wine.priceGlass !== undefined && wine.priceGlass !== null ? wine.priceGlass : undefined,
        priceBottle: wine.priceBottle !== undefined && wine.priceBottle !== null ? wine.priceBottle : undefined,
      })),
    }));
  };

  const [categories, setCategories] = useState<WineCategory[]>(parseInitialWineMenu());
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImporter, setShowImporter] = useState(false);

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Dialog states
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showAddWineDialog, setShowAddWineDialog] = useState(false);
  const [currentEditingCategory, setCurrentEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<WineCategory>>({ name: "" });
  const [newWine, setNewWine] = useState<Partial<Wine>>({
    name: "",
    winery: "",
    priceGlass: undefined,
    priceBottle: undefined,
  });

  // Edit category state
  const [editingCategory, setEditingCategory] = useState<WineCategory | null>(null);

  // Edit wine state
  const [editingWine, setEditingWine] = useState<{ categoryId: string; wine: Wine } | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-save with debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isReadOnly) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(async () => {
      await autoSaveChanges();
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [categories]);

  // Auto-save function
  const autoSaveChanges = async () => {
    try {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      formData.set("wineMenu", JSON.stringify({ categories }));

      await updateWineMenu(formData);
      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err: any) {
      console.error("Error en auto-guardado:", err);
      setSaveStatus("idle");
      setErrorMessage(err?.message || "Error al auto-guardar");
    }
  };

  // Handle category drag end
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle wine drag end
  const handleWineDragEnd = (categoryId: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategories((cats) =>
        cats.map((cat) => {
          if (cat.id === categoryId) {
            const oldIndex = cat.wines.findIndex((wine) => wine.id === active.id);
            const newIndex = cat.wines.findIndex((wine) => wine.id === over.id);

            return {
              ...cat,
              wines: arrayMove(cat.wines, oldIndex, newIndex),
            };
          }
          return cat;
        })
      );
    }
  };

  // Toggle expand/collapse category
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Add category
  const addCategory = () => {
    if (!newCategory.name) return;

    const category: WineCategory = {
      id: `winecat-${Date.now()}`,
      name: newCategory.name!,
      wines: [],
    };

    setCategories((prev) => [...prev, category]);
    setExpandedCategories((prev) => new Set([...prev, category.id]));
    setShowAddCategoryDialog(false);
    setNewCategory({ name: "" });
  };

  // Delete category
  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
  };

  // Open add wine dialog
  const openAddWineDialog = (categoryId: string) => {
    setCurrentEditingCategory(categoryId);
    setNewWine({
      name: "",
      winery: "",
      priceGlass: undefined,
      priceBottle: undefined,
    });
    setShowAddWineDialog(true);
  };

  // Add wine
  const addWine = () => {
    if (!currentEditingCategory || !newWine.name) return;

    const wine: Wine = {
      id: `wine-${Date.now()}`,
      name: newWine.name!,
      winery: newWine.winery,
      priceGlass: newWine.priceGlass,
      priceBottle: newWine.priceBottle,
    };

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === currentEditingCategory
          ? { ...cat, wines: [...cat.wines, wine] }
          : cat
      )
    );

    setShowAddWineDialog(false);
    setCurrentEditingCategory(null);
  };

  // Open edit wine dialog
  const openEditWineDialog = (categoryId: string, wine: Wine) => {
    setEditingWine({ categoryId, wine: { ...wine } });
  };

  // Save wine edit
  const saveWineEdit = () => {
    if (!editingWine) return;

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === editingWine.categoryId
          ? {
              ...cat,
              wines: cat.wines.map((w) =>
                w.id === editingWine.wine.id ? editingWine.wine : w
              ),
            }
          : cat
      )
    );

    setEditingWine(null);
  };

  // Delete wine
  const deleteWine = (categoryId: string, wineId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, wines: cat.wines.filter((wine) => wine.id !== wineId) }
          : cat
      )
    );
  };

  // Filter categories and wines
  const filteredCategories = categories
    .map((category) => {
      const filteredWines = category.wines.filter((wine) => {
        const matchesSearch = searchQuery === "" ||
          wine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wine.winery?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
      });

      return { ...category, wines: filteredWines };
    })
    .filter((category) => {
      const matchesSearch = searchQuery === "" ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.wines.length > 0;

      return matchesSearch;
    });

  // Check if wine menu is empty
  const isWineMenuEmpty = categories.length === 0 || categories.every(c => c.wines.length === 0);

  return (
    <div className="space-y-6">
      {/* Header with view toggle and save indicator */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            Carta de vinos
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {viewMode === "edit"
              ? "Organiza tu carta de vinos. Los cambios se guardan automaticamente."
              : "Vista previa de como veran tus clientes la carta de vinos"
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "edit"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "preview"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Save indicator */}
          {(saveStatus === "saving" || saveStatus === "saved") && (
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === "saving" && (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-zinc-400">Guardando...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="text-emerald-400 text-base">✓</span>
                  <span className="text-emerald-400">Guardado</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
          {errorMessage}
        </div>
      )}

      {/* Edit Mode */}
      {viewMode === "edit" && (
        <>
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar vinos o categorias..."
              className="w-full text-sm rounded-lg bg-zinc-900/60 border border-zinc-700 pl-10 pr-4 py-2.5 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-zinc-100">{categories.length}</div>
              <div className="text-xs text-zinc-400 mt-1">Categorias</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-zinc-100">
                {categories.reduce((acc, cat) => acc + cat.wines.length, 0)}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Vinos totales</div>
            </div>
          </div>

          {/* Categories list with drag & drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={filteredCategories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredCategories.length === 0 && searchQuery === "" ? (
                  showImporter ? (
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6">
                      <WineImporter
                        onImport={(importedCategories) => {
                          setCategories(importedCategories);
                          setExpandedCategories(new Set(importedCategories.map(c => c.id)));
                          setShowImporter(false);
                        }}
                        onCancel={() => setShowImporter(false)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                      <div className="text-4xl mb-3">🍷</div>
                      <p className="text-sm text-zinc-400 mb-4">
                        Aun no hay vinos en tu carta
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          type="button"
                          onClick={() => setShowImporter(true)}
                          disabled={isReadOnly}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                        >
                          Importar carta de vinos
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddCategoryDialog(true)}
                          disabled={isReadOnly}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                        >
                          + Anadir manualmente
                        </button>
                      </div>
                    </div>
                  )
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-sm text-zinc-400">
                      No se encontraron resultados para "{searchQuery}"
                    </p>
                  </div>
                ) : (
                  filteredCategories.map((category) => {
                    const isExpanded = expandedCategories.has(category.id);

                    return (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        isExpanded={isExpanded}
                        onToggle={() => toggleCategory(category.id)}
                        onEdit={() => setEditingCategory(category)}
                        onDelete={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: "Eliminar categoria",
                            message: `Eliminar la categoria "${category.name}" y todos sus vinos?`,
                            onConfirm: () => {
                              deleteCategory(category.id);
                              setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                            },
                          });
                        }}
                        isReadOnly={isReadOnly}
                      >
                        {/* Wines list with drag & drop */}
                        <div className="border-t border-zinc-800 p-4">
                          {category.wines.length === 0 ? (
                            <div className="text-center py-6 bg-zinc-900/60 rounded-lg border border-dashed border-zinc-700">
                              <p className="text-xs text-zinc-500 mb-3">
                                No hay vinos en esta categoria
                              </p>
                              <button
                                type="button"
                                onClick={() => openAddWineDialog(category.id)}
                                disabled={isReadOnly}
                                className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                              >
                                + Anadir vino
                              </button>
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleWineDragEnd(category.id)}
                            >
                              <SortableContext
                                items={category.wines.map(w => w.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {category.wines.map((wine) => (
                                    <SortableWine
                                      key={wine.id}
                                      wine={wine}
                                      onEdit={() => openEditWineDialog(category.id, wine)}
                                      onDelete={() => {
                                        setConfirmDialog({
                                          isOpen: true,
                                          title: "Eliminar vino",
                                          message: `Eliminar "${wine.name}"?`,
                                          onConfirm: () => {
                                            deleteWine(category.id, wine.id);
                                            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                                          },
                                        });
                                      }}
                                      isReadOnly={isReadOnly}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}

                          {/* Add wine button */}
                          {category.wines.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openAddWineDialog(category.id)}
                              disabled={isReadOnly}
                              className="w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-dashed border-zinc-700 disabled:opacity-50"
                            >
                              + Anadir vino
                            </button>
                          )}
                        </div>
                      </SortableCategory>
                    );
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add category and import buttons */}
          {categories.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowAddCategoryDialog(true)}
                disabled={isReadOnly}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                + Anadir categoria
              </button>
              <button
                type="button"
                onClick={() => setShowImporter(true)}
                disabled={isReadOnly}
                className="px-4 py-3 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Importar
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview Mode */}
      {viewMode === "preview" && (
        <WinePreview
          categories={categories}
          restaurantName={restaurantName}
          logoUrl={logoUrl}
        />
      )}

      {/* Dialog: Add category */}
      {showAddCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Nueva categoria de vinos
              </h3>
              <p className="text-sm text-zinc-400">
                Ej: Tintos Ribera, Blancos Rueda, Espumosos...
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre de la categoria *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ej: Tintos Ribera del Duero"
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryDialog(false);
                  setNewCategory({ name: "" });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCategory.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Crear categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Add wine */}
      {showAddWineDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Nuevo vino
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del vino *
                </label>
                <input
                  type="text"
                  value={newWine.name}
                  onChange={(e) => setNewWine({ ...newWine, name: e.target.value })}
                  placeholder="Ej: Protos Reserva 2019"
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Bodega
                </label>
                <input
                  type="text"
                  value={newWine.winery}
                  onChange={(e) => setNewWine({ ...newWine, winery: e.target.value })}
                  placeholder="Ej: Bodegas Protos"
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Precio copa
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newWine.priceGlass ?? ""}
                      onChange={(e) => setNewWine({ ...newWine, priceGlass: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                      placeholder="0.00"
                      className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Precio botella
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newWine.priceBottle ?? ""}
                      onChange={(e) => setNewWine({ ...newWine, priceBottle: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                      placeholder="0.00"
                      className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddWineDialog(false);
                  setCurrentEditingCategory(null);
                  setNewWine({ name: "", winery: "", priceGlass: undefined, priceBottle: undefined });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addWine}
                disabled={!newWine.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Anadir vino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Edit category */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Editar categoria
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategories((prev) =>
                    prev.map((cat) =>
                      cat.id === editingCategory.id
                        ? { ...cat, name: editingCategory.name }
                        : cat
                    )
                  );
                  setEditingCategory(null);
                }}
                disabled={!editingCategory.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Edit wine */}
      {editingWine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Editar vino
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del vino *
                </label>
                <input
                  type="text"
                  value={editingWine.wine.name}
                  onChange={(e) => setEditingWine({
                    ...editingWine,
                    wine: { ...editingWine.wine, name: e.target.value }
                  })}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Bodega
                </label>
                <input
                  type="text"
                  value={editingWine.wine.winery || ""}
                  onChange={(e) => setEditingWine({
                    ...editingWine,
                    wine: { ...editingWine.wine, winery: e.target.value }
                  })}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Precio copa
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingWine.wine.priceGlass ?? ""}
                      onChange={(e) => setEditingWine({
                        ...editingWine,
                        wine: { ...editingWine.wine, priceGlass: e.target.value === "" ? undefined : parseFloat(e.target.value) }
                      })}
                      placeholder="0.00"
                      className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Precio botella
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingWine.wine.priceBottle ?? ""}
                      onChange={(e) => setEditingWine({
                        ...editingWine,
                        wine: { ...editingWine.wine, priceBottle: e.target.value === "" ? undefined : parseFloat(e.target.value) }
                      })}
                      placeholder="0.00"
                      className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingWine(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveWineEdit}
                disabled={!editingWine.wine.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog (when there's existing data) */}
      {showImporter && categories.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Importar carta de vinos
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Esto reemplazara tu carta actual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImporter(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <WineImporter
                onImport={(importedCategories) => {
                  setCategories(importedCategories);
                  setExpandedCategories(new Set(importedCategories.map(c => c.id)));
                  setShowImporter(false);
                }}
                onCancel={() => setShowImporter(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
