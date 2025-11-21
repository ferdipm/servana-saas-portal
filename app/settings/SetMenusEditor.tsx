"use client";

import { useState, useEffect, useRef } from "react";
import { updateSetMenus } from "./actions";

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

// Obtener platos de la carta para el selector
function getDishesFromMenu(menu: any): { id: string; name: string; categoryName: string }[] {
  if (!menu?.categories) return [];

  const dishes: { id: string; name: string; categoryName: string }[] = [];
  for (const cat of menu.categories) {
    for (const dish of cat.dishes || []) {
      dishes.push({
        id: dish.id,
        name: dish.name,
        categoryName: cat.name,
      });
    }
  }
  return dishes;
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

  // Platos disponibles de la carta
  const availableDishes = getDishesFromMenu(initialMenu);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
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
        <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-lg">
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
              className={`bg-zinc-900/40 border rounded-lg overflow-hidden transition-all ${
                menu.isActive
                  ? "border-zinc-700"
                  : "border-zinc-800 opacity-60"
              }`}
            >
              {/* Header del menú */}
              <div className="flex items-center justify-between p-4 bg-zinc-900/60 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {menu.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-zinc-100">{menu.name}</h4>
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
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {menu.isActive ? "✓ Activo" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMenu(menu)}
                    disabled={isReadOnly}
                    className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar el menú "${menu.name}"?`)) {
                        deleteMenu(menu.id);
                      }
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
                <div className="px-4 py-2 text-xs text-zinc-400 border-b border-zinc-800/50">
                  {menu.description}
                </div>
              )}

              {/* Cursos */}
              <div className="p-4 space-y-3">
                {menu.courses.length === 0 ? (
                  <div className="text-center py-4 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-700">
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
                      className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-900/40 text-indigo-300 text-xs flex items-center justify-center font-medium">
                            {courseIndex + 1}
                          </span>
                          <span className="text-sm font-medium text-zinc-200">
                            {course.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddOptionDialog({
                                menuId: menu.id,
                                courseId: course.id,
                              })
                            }
                            disabled={isReadOnly}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-1"
                          >
                            + Opción
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Eliminar "${course.name}"?`)) {
                                deleteCourse(menu.id, course.id);
                              }
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
                        <p className="text-xs text-zinc-500 italic pl-8">
                          Sin opciones configuradas
                        </p>
                      ) : (
                        <div className="pl-8 space-y-1">
                          {course.options.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center justify-between text-xs group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500">•</span>
                                <span className="text-zinc-300">
                                  {option.type === "text"
                                    ? option.text
                                    : option.dishName}
                                </span>
                                {option.type === "dish" && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-900/20 text-indigo-400 text-[9px]">
                                    De carta
                                  </span>
                                )}
                                {option.supplement !== undefined &&
                                  option.supplement > 0 && (
                                    <span className="text-amber-400 text-[10px]">
                                      (+{option.supplement.toFixed(2)}€)
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
                    className="w-full py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/30 hover:bg-zinc-900/50 border border-dashed border-zinc-700 transition-colors"
                  >
                    + Añadir curso
                  </button>
                )}
              </div>

              {/* Suplementos */}
              {(menu.supplements.length > 0 || !isReadOnly) && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t border-zinc-800/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-400">
                        Suplementos opcionales
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddSupplementDialog(menu.id)}
                        disabled={isReadOnly}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
                      >
                        + Añadir
                      </button>
                    </div>
                    {menu.supplements.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">
                        Sin suplementos configurados
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {menu.supplements.map((supp) => (
                          <div
                            key={supp.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900/20 border border-amber-800/40 text-xs group"
                          >
                            <span className="text-amber-300">{supp.name}</span>
                            <span className="text-amber-400 font-medium">
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                📋 Nuevo menú
              </h3>
              <p className="text-sm text-zinc-400">
                Crea un menú cerrado con precio fijo
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre del menú *
                </label>
                <input
                  type="text"
                  value={newMenu.name}
                  onChange={(e) =>
                    setNewMenu({ ...newMenu, name: e.target.value })
                  }
                  placeholder="Ej: Menú del día, Menú degustación..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    €
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Descripción
                </label>
                <textarea
                  value={newMenu.description}
                  onChange={(e) =>
                    setNewMenu({ ...newMenu, description: e.target.value })
                  }
                  placeholder="Ej: Incluye pan, bebida y café"
                  rows={2}
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Condiciones
                </label>
                <input
                  type="text"
                  value={newMenu.conditions}
                  onChange={(e) =>
                    setNewMenu({ ...newMenu, conditions: e.target.value })
                  }
                  placeholder="Ej: L-V mediodía, Mínimo 2 personas..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={createMenu}
                disabled={!newMenu.name || newMenu.price === undefined}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Crear menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Editar menú */}
      {editingMenu && !showAddCourseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                ✏️ Editar menú
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editingMenu.name}
                  onChange={(e) =>
                    setEditingMenu({ ...editingMenu, name: e.target.value })
                  }
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    €
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Añadir curso
              </h3>
              <p className="text-sm text-zinc-400">
                Añade un nuevo tiempo al menú "{editingMenu.name}"
              </p>
            </div>

            <div className="p-6">
              <label className="text-sm text-zinc-300 font-medium mb-2 block">
                Nombre del curso *
              </label>
              <input
                type="text"
                value={newCourse.name}
                onChange={(e) => setNewCourse({ name: e.target.value })}
                placeholder="Ej: Primero, Segundo, Postre..."
                className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddCourseDialog(false);
                  setNewCourse({ name: "" });
                  setEditingMenu(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
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
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
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
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  🍽️ De la carta
                </button>
              </div>

              {/* Input según tipo */}
              {newOption.type === "text" ? (
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
                    Nombre de la opción *
                  </label>
                  <input
                    type="text"
                    value={newOption.text || ""}
                    onChange={(e) =>
                      setNewOption({ ...newOption, text: e.target.value })
                    }
                    placeholder="Ej: Ensalada mixta, Sopa del día..."
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                      className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    +€
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Coste extra por elegir esta opción
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Añadir suplemento
              </h3>
              <p className="text-sm text-zinc-400">
                Añade un extra opcional al menú
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newSupplement.name || ""}
                  onChange={(e) =>
                    setNewSupplement({ ...newSupplement, name: e.target.value })
                  }
                  placeholder="Ej: Postre especial, Copa de vino..."
                  className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
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
                    className="w-full text-sm rounded bg-zinc-800 border border-zinc-700 pl-6 pr-2 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    +€
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddSupplementDialog(null);
                  setNewSupplement({ name: "", price: undefined });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
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
    </div>
  );
}
