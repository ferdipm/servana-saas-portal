"use client";

import { useState, useEffect, useRef } from "react";
import { updateSetMenus } from "./actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Tipos para los menús cerrados
type CourseOption = {
  id: string;
  type: "text" | "dish";
  text?: string;
  dishId?: string;
  dishName?: string;
  supplement?: number;
};

type SetMenuCourse = {
  id: string;
  name: string;
  options: CourseOption[];
};

type Supplement = {
  id: string;
  name: string;
  price: number;
};

type SetMenu = {
  id: string;
  name: string;
  price: number;
  description?: string;
  conditions?: string;
  isActive: boolean;
  courses: SetMenuCourse[];
  supplements: Supplement[];
};

type SetMenusEditorProps = {
  restaurantId: string;
  initialSetMenus: any;
  initialMenu: any;
  isReadOnly: boolean;
};

// Tipo para platos con categoría
type DishWithCategory = {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
};

// Tipo para categorías con platos
type CategoryWithDishes = {
  id: string;
  name: string;
  emoji: string;
  dishes: { id: string; name: string }[];
};

// Obtener platos de la carta para el selector
function getDishesFromMenu(menu: any): DishWithCategory[] {
  if (!menu?.categories) return [];

  const dishes: DishWithCategory[] = [];
  for (const cat of menu.categories) {
    for (const dish of cat.dishes || []) {
      dishes.push({
        id: dish.id,
        name: dish.name,
        categoryName: cat.name,
        categoryId: cat.id,
      });
    }
  }
  return dishes;
}

// Obtener categorías con sus platos
function getCategoriesFromMenu(menu: any): CategoryWithDishes[] {
  if (!menu?.categories) return [];
  return menu.categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    emoji: cat.emoji || "🍽️",
    dishes: (cat.dishes || []).map((d: any) => ({ id: d.id, name: d.name })),
  }));
}

export function SetMenusEditor({
  restaurantId,
  initialSetMenus,
  initialMenu,
  isReadOnly,
}: SetMenusEditorProps) {
  // Parse initial set menus
  const parseInitialSetMenus = (): SetMenu[] => {
    if (!initialSetMenus || !Array.isArray(initialSetMenus)) {
      return [];
    }
    return initialSetMenus;
  };

  const [setMenus, setSetMenus] = useState<SetMenu[]>(parseInitialSetMenus());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMenu, setEditingMenu] = useState<SetMenu | null>(null);
  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);
  const [showAddOptionDialog, setShowAddOptionDialog] = useState<{ menuId: string; courseId: string } | null>(null);
  const [showAddSupplementDialog, setShowAddSupplementDialog] = useState<string | null>(null);

  // Estados para nuevo menú
  const [newMenu, setNewMenu] = useState<Partial<SetMenu>>({
    name: "",
    price: undefined,
    description: "",
    conditions: "",
  });

  // Estados para nuevo curso
  const [newCourse, setNewCourse] = useState({ name: "" });

  // Estados para nueva opción
  const [newOption, setNewOption] = useState<Partial<CourseOption>>({
    type: "text",
    text: "",
    dishId: "",
    supplement: undefined,
  });

  // Estados para nuevo suplemento
  const [newSupplement, setNewSupplement] = useState<Partial<Supplement>>({
    name: "",
    price: undefined,
  });

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Estado para el selector de platos mejorado
  const [showDishPicker, setShowDishPicker] = useState<{
    menuId: string;
    courseId: string;
  } | null>(null);
  const [dishPickerSearch, setDishPickerSearch] = useState("");
  const [dishPickerSelectedCategory, setDishPickerSelectedCategory] = useState<string | null>(null);
  const [dishPickerSelectedDishes, setDishPickerSelectedDishes] = useState<Set<string>>(new Set());
  const [dishPickerSupplements, setDishPickerSupplements] = useState<Record<string, number>>({});

  // Platos disponibles de la carta
  const availableDishes = getDishesFromMenu(initialMenu);
  const availableCategories = getCategoriesFromMenu(initialMenu);

  // Auto-guardado
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
  }, [setMenus]);

  const autoSaveChanges = async () => {
    try {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      formData.set("setMenus", JSON.stringify(setMenus));

      await updateSetMenus(formData);
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

  // Crear menú
  const createMenu = () => {
    if (!newMenu.name || newMenu.price === undefined) return;

    const menu: SetMenu = {
      id: `setmenu-${Date.now()}`,
      name: newMenu.name,
      price: newMenu.price,
      description: newMenu.description || "",
      conditions: newMenu.conditions || "",
      isActive: true,
      courses: [],
      supplements: [],
    };

    setSetMenus((prev) => [...prev, menu]);
    setShowCreateDialog(false);
    setNewMenu({ name: "", price: undefined, description: "", conditions: "" });
  };

  // Eliminar menú
  const deleteMenu = (menuId: string) => {
    setSetMenus((prev) => prev.filter((m) => m.id !== menuId));
  };

  // Toggle activo/inactivo
  const toggleMenuActive = (menuId: string) => {
    setSetMenus((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, isActive: !m.isActive } : m))
    );
  };

  // Actualizar menú
  const updateMenu = (menuId: string, field: keyof SetMenu, value: any) => {
    setSetMenus((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, [field]: value } : m))
    );
  };

  // Añadir curso a menú
  const addCourse = (menuId: string) => {
    if (!newCourse.name) return;

    const course: SetMenuCourse = {
      id: `course-${Date.now()}`,
      name: newCourse.name,
      options: [],
    };

    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === menuId ? { ...m, courses: [...m.courses, course] } : m
      )
    );

    setShowAddCourseDialog(false);
    setNewCourse({ name: "" });
  };

  // Eliminar curso
  const deleteCourse = (menuId: string, courseId: string) => {
    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? { ...m, courses: m.courses.filter((c) => c.id !== courseId) }
          : m
      )
    );
  };

  // Añadir opción a curso
  const addOption = (menuId: string, courseId: string) => {
    if (newOption.type === "text" && !newOption.text) return;
    if (newOption.type === "dish" && !newOption.dishId) return;

    const option: CourseOption = {
      id: `option-${Date.now()}`,
      type: newOption.type!,
      text: newOption.type === "text" ? newOption.text : undefined,
      dishId: newOption.type === "dish" ? newOption.dishId : undefined,
      dishName:
        newOption.type === "dish"
          ? availableDishes.find((d) => d.id === newOption.dishId)?.name
          : undefined,
      supplement: newOption.supplement,
    };

    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? {
              ...m,
              courses: m.courses.map((c) =>
                c.id === courseId ? { ...c, options: [...c.options, option] } : c
              ),
            }
          : m
      )
    );

    setShowAddOptionDialog(null);
    setNewOption({ type: "text", text: "", dishId: "", supplement: undefined });
  };

  // Eliminar opción
  const deleteOption = (menuId: string, courseId: string, optionId: string) => {
    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? {
              ...m,
              courses: m.courses.map((c) =>
                c.id === courseId
                  ? { ...c, options: c.options.filter((o) => o.id !== optionId) }
                  : c
              ),
            }
          : m
      )
    );
  };

  // Añadir suplemento
  const addSupplement = (menuId: string) => {
    if (!newSupplement.name || newSupplement.price === undefined) return;

    const supplement: Supplement = {
      id: `supp-${Date.now()}`,
      name: newSupplement.name,
      price: newSupplement.price,
    };

    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? { ...m, supplements: [...m.supplements, supplement] }
          : m
      )
    );

    setShowAddSupplementDialog(null);
    setNewSupplement({ name: "", price: undefined });
  };

  // Eliminar suplemento
  const deleteSupplement = (menuId: string, supplementId: string) => {
    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? { ...m, supplements: m.supplements.filter((s) => s.id !== supplementId) }
          : m
      )
    );
  };

  // Añadir múltiples platos desde el picker
  const addDishesFromPicker = () => {
    if (!showDishPicker || dishPickerSelectedDishes.size === 0) return;

    const newOptions: CourseOption[] = [];
    dishPickerSelectedDishes.forEach((dishId) => {
      const dish = availableDishes.find((d) => d.id === dishId);
      if (dish) {
        newOptions.push({
          id: `option-${Date.now()}-${dishId}`,
          type: "dish",
          dishId: dish.id,
          dishName: dish.name,
          supplement: dishPickerSupplements[dishId] || undefined,
        });
      }
    });

    setSetMenus((prev) =>
      prev.map((m) =>
        m.id === showDishPicker.menuId
          ? {
              ...m,
              courses: m.courses.map((c) =>
                c.id === showDishPicker.courseId
                  ? { ...c, options: [...c.options, ...newOptions] }
                  : c
              ),
            }
          : m
      )
    );

    // Reset picker state
    setShowDishPicker(null);
    setDishPickerSearch("");
    setDishPickerSelectedCategory(null);
    setDishPickerSelectedDishes(new Set());
    setDishPickerSupplements({});
  };

  // Toggle dish selection in picker
  const toggleDishInPicker = (dishId: string) => {
    setDishPickerSelectedDishes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dishId)) {
        newSet.delete(dishId);
      } else {
        newSet.add(dishId);
      }
      return newSet;
    });
  };

  // Filter dishes for picker
  const getFilteredDishesForPicker = () => {
    let dishes = availableDishes;

    // Filter by category
    if (dishPickerSelectedCategory) {
      dishes = dishes.filter((d) => d.categoryId === dishPickerSelectedCategory);
    }

    // Filter by search
    if (dishPickerSearch.trim()) {
      const search = dishPickerSearch.toLowerCase();
      dishes = dishes.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.categoryName.toLowerCase().includes(search)
      );
    }

    return dishes;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Menús del restaurante
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Crea menús cerrados como Menú del día, Menú degustación, etc.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de guardado */}
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

      {/* Error */}
      {errorMessage && (
        <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
          {errorMessage}
        </div>
      )}

      {/* Lista de menús */}
      {setMenus.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-zinc-400 mb-4">
            Aún no hay menús creados
          </p>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            disabled={isReadOnly}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            + Crear primer menú
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {setMenus.map((menu) => (
            <div
              key={menu.id}
              className={`bg-white dark:bg-zinc-900/40 border rounded-lg overflow-hidden transition-all ${
                menu.isActive
                  ? "border-zinc-200 dark:border-zinc-700"
                  : "border-zinc-200 dark:border-zinc-800 opacity-60"
              }`}
            >
              {/* Header del menú */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {menu.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{menu.name}</h4>
                      {!menu.isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-700 text-zinc-400">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-400 font-medium">
                        {menu.price.toFixed(2)}€
                      </span>
                      {menu.conditions && (
                        <span className="text-zinc-500 text-xs">
                          • {menu.conditions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMenuActive(menu.id)}
                    disabled={isReadOnly}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      menu.isActive
                        ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {menu.isActive ? "✓ Activo" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMenu(menu)}
                    disabled={isReadOnly}
                    className="px-2 py-1 rounded text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: "Eliminar menú",
                        message: `¿Eliminar el menú "${menu.name}"?`,
                        onConfirm: () => {
                          deleteMenu(menu.id);
                          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                        },
                      });
                    }}
                    disabled={isReadOnly}
                    className="px-2 py-1 rounded text-xs bg-rose-900/50 hover:bg-rose-900 text-rose-200"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Descripción */}
              {menu.description && (
                <div className="px-4 py-2 text-xs text-zinc-400 border-b border-zinc-200 dark:border-zinc-800/50">
                  {menu.description}
                </div>
              )}

              {/* Cursos */}
              <div className="p-4 space-y-3">
                {menu.courses.length === 0 ? (
                  <div className="text-center py-4 bg-white dark:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs text-zinc-500 mb-2">
                      Este menú no tiene cursos
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMenu(menu);
                        setShowAddCourseDialog(true);
                      }}
                      disabled={isReadOnly}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      + Añadir curso
                    </button>
                  </div>
                ) : (
                  menu.courses.map((course, courseIndex) => (
                    <div
                      key={course.id}
                      className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-900/40 text-indigo-300 text-xs flex items-center justify-center font-medium">
                            {courseIndex + 1}
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            {course.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Dropdown para añadir opciones */}
                          <div className="relative group">
                            <button
                              type="button"
                              disabled={isReadOnly}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/50 transition-colors disabled:opacity-50"
                            >
                              <span>+</span>
                              <span>Añadir opción</span>
                              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddOptionDialog({
                                    menuId: menu.id,
                                    courseId: course.id,
                                  })
                                }
                                disabled={isReadOnly}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
                              >
                                <span>✏️</span>
                                <span>Texto libre</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDishPicker({
                                    menuId: menu.id,
                                    courseId: course.id,
                                  });
                                }}
                                disabled={isReadOnly || availableDishes.length === 0}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left disabled:opacity-50"
                              >
                                <span>🍽️</span>
                                <span>Platos de la carta</span>
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: "Eliminar curso",
                                message: `¿Eliminar "${course.name}"?`,
                                onConfirm: () => {
                                  deleteCourse(menu.id, course.id);
                                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                                },
                              });
                            }}
                            disabled={isReadOnly}
                            className="text-[10px] text-rose-500 hover:text-rose-300 px-1"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Opciones del curso */}
                      {course.options.length === 0 ? (
                        <div className="mt-3 p-4 rounded-lg bg-white dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-700">
                          <p className="text-xs text-zinc-500 text-center mb-3">
                            Añade las opciones que el cliente puede elegir
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                setShowAddOptionDialog({
                                  menuId: menu.id,
                                  courseId: course.id,
                                })
                              }
                              disabled={isReadOnly}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                            >
                              <span>✏️</span>
                              <span>Texto libre</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDishPicker({
                                  menuId: menu.id,
                                  courseId: course.id,
                                });
                              }}
                              disabled={isReadOnly || availableDishes.length === 0}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                            >
                              <span>🍽️</span>
                              <span>Platos de la carta</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pl-8 space-y-1">
                          {course.options.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center justify-between text-xs group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500">•</span>
                                <span className="text-zinc-700 dark:text-zinc-300">
                                  {option.type === "text"
                                    ? option.text
                                    : option.dishName}
                                </span>
                                {option.type === "dish" && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-medium border border-indigo-200 dark:border-indigo-800/50">
                                    De carta
                                  </span>
                                )}
                                {option.supplement !== undefined &&
                                  option.supplement > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded">
                                      +{option.supplement.toFixed(2)}€
                                    </span>
                                  )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteOption(menu.id, course.id, option.id)
                                }
                                disabled={isReadOnly}
                                className="text-rose-500 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Botón añadir curso */}
                {menu.courses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMenu(menu);
                      setShowAddCourseDialog(true);
                    }}
                    disabled={isReadOnly}
                    className="w-full py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-900 dark:text-zinc-200 bg-white dark:bg-zinc-900/30 hover:bg-white dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    + Añadir curso
                  </button>
                )}
              </div>

              {/* Suplementos */}
              {(menu.supplements.length > 0 || !isReadOnly) && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t border-zinc-200 dark:border-zinc-800/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        Suplementos opcionales
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddSupplementDialog(menu.id)}
                        disabled={isReadOnly}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
                      >
                        + Añadir
                      </button>
                    </div>
                    {menu.supplements.length === 0 ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                        Sin suplementos configurados
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {menu.supplements.map((supp) => (
                          <div
                            key={supp.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800/40 text-xs group"
                          >
                            <span className="text-amber-700 dark:text-amber-300">{supp.name}</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              +{supp.price.toFixed(2)}€
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSupplement(menu.id, supp.id)}
                              disabled={isReadOnly}
                              className="text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Botón crear nuevo menú */}
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            disabled={isReadOnly}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            + Crear nuevo menú
          </button>
        </div>
      )}

      {/* Diálogo: Crear menú */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                📋 Nuevo menú
              </h3>
              <p className="text-sm text-zinc-400">
                Crea un menú cerrado con precio fijo
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Nombre del menú *
                </label>
                <input
                  type="text"
                  value={newMenu.name}
                  onChange={(e) =>
                    setNewMenu({ ...newMenu, name: e.target.value })
                  }
                  placeholder="Ej: Menú del día, Menú degustación..."
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Precio *
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMenu.price ?? ""}
                    onChange={(e) =>
                      setNewMenu({
                        ...newMenu,
                        price:
                          e.target.value === ""
                            ? undefined
                            : parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 pl-6 pr-2 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    €
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Descripción
                </label>
                <textarea
                  value={newMenu.description}
                  onChange={(e) =>
                    setNewMenu({ ...newMenu, description: e.target.value })
                  }
                  placeholder="Ej: Incluye pan, bebida y café"
                  rows={2}
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Condiciones
                </label>
                <input
                  type="text"
                  value={newMenu.conditions}
                  onChange={(e) =>
                    setNewMenu({ ...newMenu, conditions: e.target.value })
                  }
                  placeholder="Ej: L-V mediodía, Mínimo 2 personas..."
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewMenu({
                    name: "",
                    price: undefined,
                    description: "",
                    conditions: "",
                  });
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={createMenu}
                disabled={!newMenu.name || newMenu.price === undefined}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
              >
                ✨ Crear menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Editar menú */}
      {editingMenu && !showAddCourseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                ✏️ Editar menú
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editingMenu.name}
                  onChange={(e) =>
                    setEditingMenu({ ...editingMenu, name: e.target.value })
                  }
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Precio *
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingMenu.price}
                    onChange={(e) =>
                      setEditingMenu({
                        ...editingMenu,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm pl-6 pr-2 py-2.5 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    €
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Descripción
                </label>
                <textarea
                  value={editingMenu.description || ""}
                  onChange={(e) =>
                    setEditingMenu({
                      ...editingMenu,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Condiciones
                </label>
                <input
                  type="text"
                  value={editingMenu.conditions || ""}
                  onChange={(e) =>
                    setEditingMenu({
                      ...editingMenu,
                      conditions: e.target.value,
                    })
                  }
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  updateMenu(editingMenu.id, "name", editingMenu.name);
                  updateMenu(editingMenu.id, "price", editingMenu.price);
                  updateMenu(
                    editingMenu.id,
                    "description",
                    editingMenu.description
                  );
                  updateMenu(
                    editingMenu.id,
                    "conditions",
                    editingMenu.conditions
                  );
                  setEditingMenu(null);
                }}
                disabled={!editingMenu.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Añadir curso */}
      {showAddCourseDialog && editingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Añadir curso
              </h3>
              <p className="text-sm text-zinc-400">
                Añade un nuevo tiempo al menú "{editingMenu.name}"
              </p>
            </div>

            <div className="p-6">
              <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                Nombre del curso *
              </label>
              <input
                type="text"
                value={newCourse.name}
                onChange={(e) => setNewCourse({ name: e.target.value })}
                placeholder="Ej: Primero, Segundo, Postre..."
                className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddCourseDialog(false);
                  setNewCourse({ name: "" });
                  setEditingMenu(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  addCourse(editingMenu.id);
                  setEditingMenu(null);
                }}
                disabled={!newCourse.name}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Añadir opción */}
      {showAddOptionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Añadir opción
              </h3>
              <p className="text-sm text-zinc-400">
                Añade una opción a elegir para este curso
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Selector de tipo */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setNewOption({ ...newOption, type: "text", dishId: "" })
                  }
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    newOption.type === "text"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  ✏️ Texto libre
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewOption({ ...newOption, type: "dish", text: "" })
                  }
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    newOption.type === "dish"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  🍽️ De la carta
                </button>
              </div>

              {/* Input según tipo */}
              {newOption.type === "text" ? (
                <div>
                  <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                    Nombre de la opción *
                  </label>
                  <input
                    type="text"
                    value={newOption.text || ""}
                    onChange={(e) =>
                      setNewOption({ ...newOption, text: e.target.value })
                    }
                    placeholder="Ej: Ensalada mixta, Sopa del día..."
                    className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                    Seleccionar plato de la carta *
                  </label>
                  {availableDishes.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">
                      No hay platos en la carta. Añade platos primero.
                    </p>
                  ) : (
                    <select
                      value={newOption.dishId || ""}
                      onChange={(e) =>
                        setNewOption({ ...newOption, dishId: e.target.value })
                      }
                      className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecciona un plato...</option>
                      {availableDishes.map((dish) => (
                        <option key={dish.id} value={dish.id}>
                          {dish.name} ({dish.categoryName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Suplemento opcional */}
              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Suplemento (opcional)
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newOption.supplement ?? ""}
                    onChange={(e) =>
                      setNewOption({
                        ...newOption,
                        supplement:
                          e.target.value === ""
                            ? undefined
                            : parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm pl-6 pr-2 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    +€
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  Coste extra por elegir esta opción
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddOptionDialog(null);
                  setNewOption({
                    type: "text",
                    text: "",
                    dishId: "",
                    supplement: undefined,
                  });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  addOption(
                    showAddOptionDialog.menuId,
                    showAddOptionDialog.courseId
                  )
                }
                disabled={
                  (newOption.type === "text" && !newOption.text) ||
                  (newOption.type === "dish" && !newOption.dishId)
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Añadir suplemento */}
      {showAddSupplementDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Añadir suplemento
              </h3>
              <p className="text-sm text-zinc-400">
                Añade un extra opcional al menú
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newSupplement.name || ""}
                  onChange={(e) =>
                    setNewSupplement({ ...newSupplement, name: e.target.value })
                  }
                  placeholder="Ej: Postre especial, Copa de vino..."
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-3 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-2 block">
                  Precio *
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSupplement.price ?? ""}
                    onChange={(e) =>
                      setNewSupplement({
                        ...newSupplement,
                        price:
                          e.target.value === ""
                            ? undefined
                            : parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm pl-6 pr-2 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    +€
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddSupplementDialog(null);
                  setNewSupplement({ name: "", price: undefined });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => addSupplement(showAddSupplementDialog)}
                disabled={
                  !newSupplement.name || newSupplement.price === undefined
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Selector de platos mejorado */}
      {showDishPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                🍽️ Seleccionar platos de la carta
              </h3>
              <p className="text-sm text-zinc-400">
                Selecciona los platos que quieres añadir como opciones
              </p>
            </div>

            {/* Búsqueda y filtros */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
              {/* Barra de búsqueda */}
              <div className="relative">
                <input
                  type="text"
                  value={dishPickerSearch}
                  onChange={(e) => setDishPickerSearch(e.target.value)}
                  placeholder="Buscar platos..."
                  className="w-full text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm pl-10 pr-4 py-2.5 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {dishPickerSearch && (
                  <button
                    type="button"
                    onClick={() => setDishPickerSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por categorías */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDishPickerSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    !dishPickerSelectedCategory
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  Todas ({availableDishes.length})
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDishPickerSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      dishPickerSelectedCategory === cat.id
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {cat.emoji} {cat.name} ({cat.dishes.length})
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de platos */}
            <div className="flex-1 overflow-y-auto p-4">
              {getFilteredDishesForPicker().length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm text-zinc-400">
                    {dishPickerSearch
                      ? `No se encontraron platos con "${dishPickerSearch}"`
                      : "No hay platos en esta categoría"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getFilteredDishesForPicker().map((dish) => {
                    const isSelected = dishPickerSelectedDishes.has(dish.id);
                    return (
                      <div
                        key={dish.id}
                        onClick={() => toggleDishInPicker(dish.id)}
                        className={`relative p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500"
                            : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox visual */}
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-zinc-600"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {dish.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {dish.categoryName}
                            </p>
                          </div>
                        </div>

                        {/* Input de suplemento si está seleccionado */}
                        {isSelected && (
                          <div
                            className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-zinc-400 whitespace-nowrap">
                                Suplemento:
                              </label>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={dishPickerSupplements[dish.id] ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDishPickerSupplements((prev) => ({
                                      ...prev,
                                      [dish.id]:
                                        val === "" ? 0 : parseFloat(val),
                                    }));
                                  }}
                                  placeholder="0.00"
                                  className="w-full text-xs rounded bg-white dark:bg-zinc-900 border border-zinc-600 pl-5 pr-2 py-1 text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                                  +€
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer con seleccionados y acciones */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                  {dishPickerSelectedDishes.size > 0 ? (
                    <span>
                      <span className="text-indigo-400 font-medium">
                        {dishPickerSelectedDishes.size}
                      </span>{" "}
                      plato{dishPickerSelectedDishes.size !== 1 ? "s" : ""}{" "}
                      seleccionado{dishPickerSelectedDishes.size !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span>Selecciona al menos un plato</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDishPicker(null);
                      setDishPickerSearch("");
                      setDishPickerSelectedCategory(null);
                      setDishPickerSelectedDishes(new Set());
                      setDishPickerSupplements({});
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={addDishesFromPicker}
                    disabled={dishPickerSelectedDishes.size === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Añadir {dishPickerSelectedDishes.size > 0 && `(${dishPickerSelectedDishes.size})`}
                  </button>
                </div>
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
    </div>
  );
}
