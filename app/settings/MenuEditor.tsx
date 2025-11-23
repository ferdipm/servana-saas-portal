"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { updateMenu } from "./actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MenuPreview } from "./MenuPreview";
import { MenuImporter } from "./MenuImporter";
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

// Tipos para el menú
type MenuDish = {
  id: string;
  name: string;
  price?: number;
  description?: string;
  allergens?: string[];
  hasHalfPortion?: boolean;      // ¿Tiene opción de media ración?
  halfPortionPrice?: number;     // Precio de la media ración
  notes?: string;                // Notas prácticas (ej: "Se puede hacer sin gluten")
};

type MenuCategory = {
  id: string;
  name: string;
  emoji: string;
  color?: string;
  dishes: MenuDish[];
};

type MenuEditorProps = {
  restaurantId: string;
  initialMenu: any;
  isReadOnly: boolean;
  restaurantName?: string;
  logoUrl?: string;
};

type ViewMode = "edit" | "preview";

// Emojis sugeridos para categorías
const SUGGESTED_CATEGORY_EMOJIS = [
  "🍽️", "🥗", "🍖", "🐟", "🍰", "🍷", "☕", "🥐", "🍕", "🍜", "🌮", "🍣",
  "🥚", "🍞", "🧈", "🥪", "🍔", "🍟", "🌯", "🥙", "🍱", "🍲", "🥘", "🍳"
];

// Colores sugeridos para categorías
const SUGGESTED_COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#6366f1", // indigo
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ef4444", // red
  "#14b8a6", // teal
];

// Alérgenos comunes
const COMMON_ALLERGENS = [
  "Gluten",
  "Lácteos",
  "Huevo",
  "Frutos secos",
  "Pescado",
  "Marisco",
  "Soja",
  "Apio",
  "Mostaza",
  "Sésamo",
  "Sulfitos",
  "Altramuces",
  "Moluscos",
  "Cacahuetes",
];

// Componente para categoría sortable
function SortableCategory({
  category,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  children,
  isReadOnly,
}: {
  category: MenuCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
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
      {/* Header de la categoría - STICKY */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors bg-[#0b0b0d]/95 backdrop-blur-sm border-b border-zinc-800/50 rounded-t-lg">
        <div className="flex items-center gap-3 flex-1">
          {/* Drag handle */}
          {!isReadOnly && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300"
              aria-label="Arrastrar categoría"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
              </svg>
            </button>
          )}

          {/* Emoji y color */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer"
            onClick={onToggle}
            style={{
              backgroundColor: category.color ? `${category.color}20` : "#6366f120",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: category.color || "#6366f1",
            }}
          >
            {category.emoji}
          </div>

          {/* Nombre */}
          <div className="cursor-pointer flex-1" onClick={onToggle}>
            <div className="font-medium text-zinc-100">{category.name}</div>
            <div className="text-xs text-zinc-500">
              {category.dishes.length} plato{category.dishes.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón duplicar */}
          <button
            type="button"
            onClick={onDuplicate}
            disabled={isReadOnly}
            className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
            title="Duplicar categoría"
          >
            📋
          </button>

          {/* Botón editar */}
          <button
            type="button"
            onClick={onEdit}
            disabled={isReadOnly}
            className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
          >
            ✏️
          </button>

          {/* Botón eliminar */}
          <button
            type="button"
            onClick={onDelete}
            disabled={isReadOnly}
            className="px-2 py-1 text-xs rounded bg-rose-900/50 hover:bg-rose-900 text-rose-200 disabled:opacity-50"
          >
            🗑️
          </button>

          {/* Icono expandir/colapsar */}
          <button onClick={onToggle} className="text-zinc-400 ml-2">
            {isExpanded ? "▼" : "▶"}
          </button>
        </div>
      </div>

      {/* Contenido expandible con scroll interno */}
      {isExpanded && (
        <div className="max-h-[600px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

// Componente para plato sortable
function SortableDish({
  dish,
  onEdit,
  onDelete,
  onDuplicate,
  isReadOnly,
}: {
  dish: MenuDish;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isReadOnly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dish.id, disabled: isReadOnly });

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
            aria-label="Arrastrar plato"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
            </svg>
          </button>
        )}

        <div className="flex-1 space-y-1.5">
          {/* Nombre, Precio y Media ración en la misma línea */}
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium text-zinc-100">{dish.name}</span>
            <div className="flex items-center gap-2 text-sm">
              {dish.price !== undefined && (
                <span className="text-emerald-400 font-medium">{dish.price.toFixed(2)}€</span>
              )}
              {dish.hasHalfPortion && dish.halfPortionPrice !== undefined && (
                <span className="text-xs text-zinc-400">(1/2: {dish.halfPortionPrice.toFixed(2)}€)</span>
              )}
            </div>
          </div>

          {/* Descripción */}
          {dish.description && (
            <p className="text-xs text-zinc-400">{dish.description}</p>
          )}

          {/* Notas */}
          {dish.notes && (
            <p className="text-xs text-cyan-400/80 italic">
              📝 {dish.notes}
            </p>
          )}

          {/* Alérgenos, media ración badge y botones */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-wrap gap-1 items-center">
              {/* Badge media ración */}
              {dish.hasHalfPortion && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/25 text-indigo-300 border border-indigo-800/40">
                  ½ Media ración
                </span>
              )}
              {/* Alérgenos */}
              {dish.allergens && dish.allergens.length > 0 && (
                dish.allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-900/25 text-amber-300 border border-amber-800/40"
                  >
                    ⚠️ {allergen}
                  </span>
                ))
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onEdit}
                disabled={isReadOnly}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                title="Editar plato"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={onDuplicate}
                disabled={isReadOnly}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                title="Duplicar plato"
              >
                📋
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isReadOnly}
                className="text-[10px] text-rose-500 hover:text-rose-300 disabled:opacity-50"
                title="Eliminar plato"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MenuEditor({ restaurantId, initialMenu, isReadOnly, restaurantName, logoUrl }: MenuEditorProps) {
  // Parsear menú inicial
  const parseInitialMenu = (): MenuCategory[] => {
    if (!initialMenu || !initialMenu.categories || !Array.isArray(initialMenu.categories)) {
      return [];
    }

    return initialMenu.categories.map((cat: any, index: number) => ({
      id: cat.id || `cat-${Date.now()}-${index}`,
      name: cat.name || "Sin nombre",
      emoji: cat.emoji || "🍽️",
      color: cat.color || SUGGESTED_COLORS[index % SUGGESTED_COLORS.length],
      dishes: (cat.dishes || []).map((dish: any, dishIndex: number) => ({
        id: dish.id || `dish-${Date.now()}-${dishIndex}`,
        name: dish.name || "",
        price: dish.price !== undefined && dish.price !== null ? dish.price : undefined,
        description: dish.description || "",
        allergens: dish.allergens || [],
        hasHalfPortion: dish.hasHalfPortion || false,
        halfPortionPrice: dish.halfPortionPrice,
        notes: dish.notes || "",
      })),
    }));
  };

  const [categories, setCategories] = useState<MenuCategory[]>(parseInitialMenu());
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllergenFilter, setSelectedAllergenFilter] = useState<string | null>(null);

  // Estados para auto-guardado
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Estados para modales
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showAddDishDialog, setShowAddDishDialog] = useState(false);
  const [currentEditingCategory, setCurrentEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<MenuCategory>>({
    name: "",
    emoji: "🍽️",
    color: SUGGESTED_COLORS[0],
  });
  const [newDish, setNewDish] = useState<Partial<MenuDish>>({
    name: "",
    description: "",
    allergens: [],
    price: undefined,
    hasHalfPortion: false,
    halfPortionPrice: undefined,
    notes: "",
  });

  // Estado para editar categoría
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  // Estado para editar plato existente
  const [editingDish, setEditingDish] = useState<{ categoryId: string; dish: MenuDish } | null>(null);

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Estado para importador y vaciar carta
  const [showImporter, setShowImporter] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-guardado con debounce
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

  // Función de auto-guardado
  const autoSaveChanges = async () => {
    try {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      formData.set("menu", JSON.stringify({ categories }));

      await updateMenu(formData);
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

  // Manejar fin de drag de categorías
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

  // Manejar fin de drag de platos
  const handleDishDragEnd = (categoryId: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategories((cats) =>
        cats.map((cat) => {
          if (cat.id === categoryId) {
            const oldIndex = cat.dishes.findIndex((dish) => dish.id === active.id);
            const newIndex = cat.dishes.findIndex((dish) => dish.id === over.id);

            return {
              ...cat,
              dishes: arrayMove(cat.dishes, oldIndex, newIndex),
            };
          }
          return cat;
        })
      );
    }
  };

  // Toggle expandir/colapsar categoría
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

  // Añadir categoría
  const addCategory = () => {
    if (!newCategory.name) return;

    const category: MenuCategory = {
      id: `cat-${Date.now()}`,
      name: newCategory.name!,
      emoji: newCategory.emoji!,
      color: newCategory.color,
      dishes: [],
    };

    setCategories((prev) => [...prev, category]);
    setExpandedCategories((prev) => new Set([...prev, category.id]));
    setShowAddCategoryDialog(false);
    setNewCategory({
      name: "",
      emoji: "🍽️",
      color: SUGGESTED_COLORS[0],
    });
  };

  // Duplicar categoría
  const duplicateCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const newCategory: MenuCategory = {
      ...category,
      id: `cat-${Date.now()}`,
      name: `${category.name} (copia)`,
      dishes: category.dishes.map((dish, index) => ({
        ...dish,
        id: `dish-${Date.now()}-${index}`,
      })),
    };

    setCategories((prev) => [...prev, newCategory]);
    setExpandedCategories((prev) => new Set([...prev, newCategory.id]));
  };

  // Eliminar categoría
  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
  };

  // Actualizar categoría
  const updateCategory = (categoryId: string, field: keyof MenuCategory, value: any) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, [field]: value } : cat))
    );
  };

  // Abrir diálogo para añadir plato
  const openAddDishDialog = (categoryId: string) => {
    setCurrentEditingCategory(categoryId);
    setNewDish({
      name: "",
      description: "",
      allergens: [],
      price: undefined,
      hasHalfPortion: false,
      halfPortionPrice: undefined,
      notes: "",
    });
    setShowAddDishDialog(true);
  };

  // Añadir plato
  const addDish = () => {
    if (!currentEditingCategory || !newDish.name) return;

    const dish: MenuDish = {
      id: `dish-${Date.now()}`,
      name: newDish.name!,
      description: newDish.description,
      allergens: newDish.allergens,
      price: newDish.price,
      hasHalfPortion: newDish.hasHalfPortion,
      halfPortionPrice: newDish.hasHalfPortion ? newDish.halfPortionPrice : undefined,
      notes: newDish.notes,
    };

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === currentEditingCategory
          ? { ...cat, dishes: [...cat.dishes, dish] }
          : cat
      )
    );

    setShowAddDishDialog(false);
    setCurrentEditingCategory(null);
  };

  // Abrir diálogo para editar plato existente
  const openEditDishDialog = (categoryId: string, dish: MenuDish) => {
    setEditingDish({ categoryId, dish: { ...dish } });
  };

  // Guardar edición de plato
  const saveDishEdit = () => {
    if (!editingDish) return;

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === editingDish.categoryId
          ? {
              ...cat,
              dishes: cat.dishes.map((d) =>
                d.id === editingDish.dish.id ? editingDish.dish : d
              ),
            }
          : cat
      )
    );

    setEditingDish(null);
  };

  // Toggle alérgeno en diálogo de edición
  const toggleAllergenInEditDialog = (allergen: string) => {
    if (!editingDish) return;
    const currentAllergens = editingDish.dish.allergens || [];
    const newAllergens = currentAllergens.includes(allergen)
      ? currentAllergens.filter((a) => a !== allergen)
      : [...currentAllergens, allergen];
    setEditingDish({
      ...editingDish,
      dish: { ...editingDish.dish, allergens: newAllergens },
    });
  };

  // Duplicar plato
  const duplicateDish = (categoryId: string, dishId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const dish = cat.dishes.find(d => d.id === dishId);
          if (!dish) return cat;

          const newDish: MenuDish = {
            ...dish,
            id: `dish-${Date.now()}`,
            name: `${dish.name} (copia)`,
          };

          return { ...cat, dishes: [...cat.dishes, newDish] };
        }
        return cat;
      })
    );
  };

  // Eliminar plato
  const deleteDish = (categoryId: string, dishId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, dishes: cat.dishes.filter((dish) => dish.id !== dishId) }
          : cat
      )
    );
  };

  // Actualizar plato
  const updateDish = (categoryId: string, dishId: string, field: keyof MenuDish, value: any) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              dishes: cat.dishes.map((dish) =>
                dish.id === dishId ? { ...dish, [field]: value } : dish
              ),
            }
          : cat
      )
    );
  };

  // Toggle alérgeno en el diálogo
  const toggleAllergenInDialog = (allergen: string) => {
    setNewDish((prev) => {
      const allergens = prev.allergens || [];
      if (allergens.includes(allergen)) {
        return { ...prev, allergens: allergens.filter((a) => a !== allergen) };
      } else {
        return { ...prev, allergens: [...allergens, allergen] };
      }
    });
  };

  // Exportar a JSON
  const exportToJSON = () => {
    const data = JSON.stringify({ categories }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `menu-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtrar categorías y platos según búsqueda y filtro
  const filteredCategories = categories
    .map((category) => {
      const filteredDishes = category.dishes.filter((dish) => {
        const matchesSearch = searchQuery === "" ||
          dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dish.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAllergen = !selectedAllergenFilter ||
          dish.allergens?.includes(selectedAllergenFilter);

        return matchesSearch && matchesAllergen;
      });

      return { ...category, dishes: filteredDishes };
    })
    .filter((category) => {
      const matchesSearch = searchQuery === "" ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.dishes.length > 0;

      return matchesSearch;
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
    >
      {/* Header con toggle de vista y indicador de guardado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            Menú del restaurante
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {viewMode === "edit"
              ? "Organiza tu menú con drag & drop. Los cambios se guardan automáticamente."
              : "Vista previa de cómo verán tus clientes el menú"
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle vista edición/preview */}
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
              ✏️ Editar
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
              👁️ Preview
            </button>
          </div>

          {/* Indicador de guardado */}
          {(saveStatus === "saving" || saveStatus === "saved") && (
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === "saving" && (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-zinc-400">Guardando…</span>
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

      {/* Mensajes de error */}
      {errorMessage && (
        <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
          {errorMessage}
        </div>
      )}

      {/* Modo Edición */}
      {viewMode === "edit" && (
        <>
          {/* Barra de búsqueda y filtros */}
          <div className="space-y-3">
            {/* Búsqueda y botones colapsar/expandir */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Buscar platos o categorías..."
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
              {/* Collapse/Expand all buttons */}
              {categories.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExpandedCategories(new Set(categories.map(c => c.id)))}
                    disabled={expandedCategories.size === categories.length}
                    className="p-2 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Expandir todas"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedCategories(new Set())}
                    disabled={expandedCategories.size === 0}
                    className="p-2 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Colapsar todas"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Filtros de alérgenos */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-zinc-400">Filtrar por alérgeno:</span>
              <button
                type="button"
                onClick={() => setSelectedAllergenFilter(null)}
                className={`px-2 py-1 rounded-full text-xs transition-colors ${
                  !selectedAllergenFilter
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Todos
              </button>
              {COMMON_ALLERGENS.slice(0, 6).map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => setSelectedAllergenFilter(allergen)}
                  className={`px-2 py-1 rounded-full text-xs transition-colors ${
                    selectedAllergenFilter === allergen
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-zinc-100">{categories.length}</div>
              <div className="text-xs text-zinc-400 mt-1">Categorías</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-zinc-100">
                {categories.reduce((acc, cat) => acc + cat.dishes.length, 0)}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Platos totales</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-400 mb-1">Acciones rápidas</div>
              <button
                type="button"
                onClick={exportToJSON}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                📥 Exportar JSON
              </button>
            </div>
          </div>

          {/* Lista de categorías con drag & drop */}
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
                      <MenuImporter
                        onImport={(importedCategories) => {
                          setCategories(importedCategories);
                          setExpandedCategories(new Set(importedCategories.map(c => c.id)));
                          setShowImporter(false);
                        }}
                        onCancel={() => setShowImporter(false)}
                        existingCategories={categories}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                      <div className="text-4xl mb-3">🍽️</div>
                      <p className="text-sm text-zinc-400 mb-4">
                        Aun no hay categorias en tu menu
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          type="button"
                          onClick={() => setShowImporter(true)}
                          disabled={isReadOnly}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Importar carta
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddCategoryDialog(true)}
                          disabled={isReadOnly}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50"
                        >
                          + Crear manualmente
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
                            title: "Eliminar categoría",
                            message: `¿Eliminar la categoría "${category.name}" y todos sus platos?`,
                            onConfirm: () => {
                              deleteCategory(category.id);
                              setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                            },
                          });
                        }}
                        onDuplicate={() => duplicateCategory(category.id)}
                        isReadOnly={isReadOnly}
                      >
                        {/* Lista de platos con drag & drop */}
                        <div className="border-t border-zinc-800 p-4">
                          {category.dishes.length === 0 ? (
                            <div className="text-center py-6 bg-zinc-900/60 rounded-lg border border-dashed border-zinc-700">
                              <p className="text-xs text-zinc-500 mb-3">
                                No hay platos en esta categoría
                              </p>
                              <button
                                type="button"
                                onClick={() => openAddDishDialog(category.id)}
                                disabled={isReadOnly}
                                className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                              >
                                + Añadir plato
                              </button>
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDishDragEnd(category.id)}
                            >
                              <SortableContext
                                items={category.dishes.map(d => d.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {category.dishes.map((dish) => (
                                    <SortableDish
                                      key={dish.id}
                                      dish={dish}
                                      onEdit={() => openEditDishDialog(category.id, dish)}
                                      onDelete={() => {
                                        setConfirmDialog({
                                          isOpen: true,
                                          title: "Eliminar plato",
                                          message: `¿Eliminar "${dish.name}"?`,
                                          onConfirm: () => {
                                            deleteDish(category.id, dish.id);
                                            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                                          },
                                        });
                                      }}
                                      onDuplicate={() => duplicateDish(category.id, dish.id)}
                                      isReadOnly={isReadOnly}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}

                          {/* Botón añadir plato */}
                          {category.dishes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openAddDishDialog(category.id)}
                              disabled={isReadOnly}
                              className="w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-dashed border-zinc-700 disabled:opacity-50"
                            >
                              + Añadir plato
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

          {/* Botones de acción al final */}
          {categories.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowAddCategoryDialog(true)}
                disabled={isReadOnly}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                + Añadir categoría
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
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                disabled={isReadOnly || categories.length === 0}
                className="px-4 py-3 rounded-lg text-sm font-medium bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Vaciar carta
              </button>
            </div>
          )}
        </>
      )}

      {/* Modo Preview (Vista Cliente) */}
      {viewMode === "preview" && (
        <MenuPreview
          categories={categories}
          restaurantName={restaurantName}
          logoUrl={logoUrl}
        />
      )}

      {/* Diálogo: Añadir categoría */}
      {showAddCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                ✨ Nueva categoría
              </h3>
              <p className="text-sm text-zinc-400">
                Añade una nueva categoría para organizar tu menú
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ej: Entrantes, Principales, Postres..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Emoji
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_CATEGORY_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, emoji })}
                      className={`w-10 h-10 rounded-lg border text-xl transition-all ${
                        newCategory.emoji === emoji
                          ? "bg-indigo-600 border-indigo-500 scale-110"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        newCategory.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-2">Vista previa:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{
                      backgroundColor: newCategory.color ? `${newCategory.color}20` : "#6366f120",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor: newCategory.color || "#6366f1",
                    }}
                  >
                    {newCategory.emoji}
                  </div>
                  <div className="font-medium text-zinc-200">
                    {newCategory.name || "Nombre de la categoría"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryDialog(false);
                  setNewCategory({ name: "", emoji: "🍽️", color: SUGGESTED_COLORS[0] });
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
                Crear categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Añadir plato */}
      {showAddDishDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                🍽️ Nuevo plato
              </h3>
              <p className="text-sm text-zinc-400">
                Añade un nuevo plato a la categoría
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del plato *
                </label>
                <input
                  type="text"
                  value={newDish.name}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  placeholder="Ej: Ensalada César, Filete de ternera..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Precios - Diseño en línea */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-3 block">
                  Precios
                </label>
                <div className="flex flex-wrap items-end gap-4">
                  {/* Precio normal */}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Ración completa</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newDish.price ?? ""}
                        onChange={(e) => setNewDish({ ...newDish, price: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="w-28 text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                    </div>
                  </div>

                  {/* Separador visual */}
                  <div className="hidden sm:flex items-center pb-2">
                    <div className="w-px h-8 bg-zinc-700"></div>
                  </div>

                  {/* Media ración toggle + precio */}
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={newDish.hasHalfPortion ?? false}
                        onChange={(e) => setNewDish({
                          ...newDish,
                          hasHalfPortion: e.target.checked,
                          halfPortionPrice: e.target.checked ? newDish.halfPortionPrice : undefined
                        })}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-300 whitespace-nowrap">½ ración</span>
                    </label>

                    {newDish.hasHalfPortion && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                        <label className="text-xs text-zinc-400 mb-1 block">Precio ½</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newDish.halfPortionPrice ?? ""}
                            onChange={(e) => setNewDish({ ...newDish, halfPortionPrice: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                            placeholder="0.00"
                            className="w-24 text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Descripción o ingredientes
                </label>
                <textarea
                  value={newDish.description}
                  onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                  placeholder="Ej: Lechuga romana, pollo, parmesano, crutones..."
                  rows={3}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Notas
                </label>
                <textarea
                  value={newDish.notes}
                  onChange={(e) => setNewDish({ ...newDish, notes: e.target.value })}
                  placeholder="Ej: 'Se puede preparar sin gluten', 'Picante bajo demanda', 'Mínimo 2 personas'..."
                  rows={2}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Información práctica adicional sobre el plato
                </p>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Alérgenos
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergenInDialog(allergen)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        newDish.allergens?.includes(allergen)
                          ? "bg-amber-900/50 text-amber-200 border border-amber-800"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {newDish.allergens?.includes(allergen) ? "✓ " : ""}
                      {allergen}
                    </button>
                  ))}
                </div>
              </div>

              {newDish.allergens && newDish.allergens.length > 0 && (
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 mb-2">Alérgenos seleccionados:</p>
                  <div className="flex flex-wrap gap-1">
                    {newDish.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-900/30 text-amber-200 border border-amber-800/50"
                      >
                        ⚠️ {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddDishDialog(false);
                  setCurrentEditingCategory(null);
                  setNewDish({ name: "", description: "", allergens: [], price: undefined, hasHalfPortion: false, halfPortionPrice: undefined, notes: "" });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addDish}
                disabled={!newDish.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Añadir plato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Editar categoría */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                ✏️ Editar categoría
              </h3>
              <p className="text-sm text-zinc-400">
                Modifica el nombre, emoji o color de la categoría
              </p>
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

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Emoji
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_CATEGORY_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, emoji })}
                      className={`w-10 h-10 rounded-lg border text-xl transition-all ${
                        editingCategory.emoji === emoji
                          ? "bg-indigo-600 border-indigo-500 scale-110"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        editingCategory.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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
                  updateCategory(editingCategory.id, "name", editingCategory.name);
                  updateCategory(editingCategory.id, "emoji", editingCategory.emoji);
                  updateCategory(editingCategory.id, "color", editingCategory.color);
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

      {/* Diálogo: Editar plato */}
      {editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                ✏️ Editar plato
              </h3>
              <p className="text-sm text-zinc-400">
                Modifica los datos del plato
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del plato *
                </label>
                <input
                  type="text"
                  value={editingDish.dish.name}
                  onChange={(e) => setEditingDish({
                    ...editingDish,
                    dish: { ...editingDish.dish, name: e.target.value }
                  })}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Precios - Diseño en línea */}
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-3 block">
                  Precios
                </label>
                <div className="flex flex-wrap items-end gap-4">
                  {/* Precio normal */}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Ración completa</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingDish.dish.price ?? ""}
                        onChange={(e) => setEditingDish({
                          ...editingDish,
                          dish: { ...editingDish.dish, price: e.target.value === "" ? undefined : parseFloat(e.target.value) }
                        })}
                        placeholder="0.00"
                        className="w-28 text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                    </div>
                  </div>

                  {/* Separador visual */}
                  <div className="hidden sm:flex items-center pb-2">
                    <div className="w-px h-8 bg-zinc-700"></div>
                  </div>

                  {/* Media ración toggle + precio */}
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={editingDish.dish.hasHalfPortion ?? false}
                        onChange={(e) => setEditingDish({
                          ...editingDish,
                          dish: {
                            ...editingDish.dish,
                            hasHalfPortion: e.target.checked,
                            halfPortionPrice: e.target.checked ? editingDish.dish.halfPortionPrice : undefined
                          }
                        })}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-300 whitespace-nowrap">½ ración</span>
                    </label>

                    {editingDish.dish.hasHalfPortion && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                        <label className="text-xs text-zinc-400 mb-1 block">Precio ½</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingDish.dish.halfPortionPrice ?? ""}
                            onChange={(e) => setEditingDish({
                              ...editingDish,
                              dish: { ...editingDish.dish, halfPortionPrice: e.target.value === "" ? undefined : parseFloat(e.target.value) }
                            })}
                            placeholder="0.00"
                            className="w-24 text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Descripción o ingredientes
                </label>
                <textarea
                  value={editingDish.dish.description || ""}
                  onChange={(e) => setEditingDish({
                    ...editingDish,
                    dish: { ...editingDish.dish, description: e.target.value }
                  })}
                  placeholder="Ej: Lechuga romana, pollo, parmesano, crutones..."
                  rows={3}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Notas
                </label>
                <textarea
                  value={editingDish.dish.notes || ""}
                  onChange={(e) => setEditingDish({
                    ...editingDish,
                    dish: { ...editingDish.dish, notes: e.target.value }
                  })}
                  placeholder="Ej: 'Se puede preparar sin gluten', 'Picante bajo demanda', 'Mínimo 2 personas'..."
                  rows={2}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Información práctica adicional sobre el plato
                </p>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Alérgenos
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergenInEditDialog(allergen)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        editingDish.dish.allergens?.includes(allergen)
                          ? "bg-amber-900/50 text-amber-200 border border-amber-800"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {editingDish.dish.allergens?.includes(allergen) ? "✓ " : ""}
                      {allergen}
                    </button>
                  ))}
                </div>
              </div>

              {editingDish.dish.allergens && editingDish.dish.allergens.length > 0 && (
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 mb-2">Alérgenos seleccionados:</p>
                  <div className="flex flex-wrap gap-1">
                    {editingDish.dish.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-900/30 text-amber-200 border border-amber-800/50"
                      >
                        ⚠️ {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveDishEdit}
                disabled={!editingDish.dish.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar carta (cuando ya hay categorías) */}
      {showImporter && categories.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Importar carta
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Puedes reemplazar o anadir a tu carta actual
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
              <MenuImporter
                onImport={(importedCategories) => {
                  setCategories(importedCategories);
                  setExpandedCategories(new Set(importedCategories.map(c => c.id)));
                  setShowImporter(false);
                }}
                onCancel={() => setShowImporter(false)}
                existingCategories={categories}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar vaciar carta */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-950/50 border border-rose-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Vaciar carta
              </h3>
              <p className="text-sm text-zinc-400 mb-6">
                Se eliminaran todas las categorias y platos ({categories.length} categorias, {categories.reduce((acc, cat) => acc + cat.dishes.length, 0)} platos).
                Esta accion no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategories([]);
                    setExpandedCategories(new Set());
                    setShowClearConfirm(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Vaciar carta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </form>
  );
}
