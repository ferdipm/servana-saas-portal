"use client";

import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type User = {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  isLocalUser: boolean;
};

type UsersEditorProps = {
  restaurantId: string;
  isReadOnly: boolean;
};

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  owner: { label: "Propietario", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", description: "Control total" },
  admin: { label: "Administrador", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", description: "Gestión completa" },
  manager: { label: "Manager", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300", description: "Gestión del día a día" },
  group_manager: { label: "Manager de Grupo", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300", description: "Multi-restaurante" },
  staff: { label: "Staff", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", description: "Operaciones básicas" },
  waiter: { label: "Camarero", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", description: "Atención mesas" },
  viewer: { label: "Solo lectura", color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300", description: "Ver información" },
};

export function UsersEditor({ restaurantId, isReadOnly }: UsersEditorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit user
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState("");

  // Load users
  useEffect(() => {
    loadUsers();
  }, [restaurantId]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/users?restaurantId=${restaurantId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error cargando usuarios");
      }

      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      setCreating(true);
      setError(null);

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          username: newUsername,
          password: newPassword,
          role: newRole,
          displayName: newDisplayName || newUsername,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error creando usuario");
      }

      // Add new user to list
      setUsers((prev) => [...prev, data.user]);
      setSuccess(`Usuario "${newUsername}" creado correctamente`);

      // Reset form
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
      setNewDisplayName("");
      setShowAddForm(false);

      // Clear success after 3s
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser() {
    if (!userToDelete || isReadOnly) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(
        `/api/users?userId=${userToDelete.id}&restaurantId=${restaurantId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error eliminando usuario");
      }

      // Remove from list
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccess("Usuario eliminado correctamente");
      setUserToDelete(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpdateRole() {
    if (!editingUser || isReadOnly) return;

    try {
      setError(null);

      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error actualizando usuario");
      }

      // Update in list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, role: editRole } : u
        )
      );
      setSuccess("Rol actualizado correctamente");
      setEditingUser(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err.message);
    }
  }

  function getUserIdentifier(user: User): string {
    if (user.displayName) return user.displayName;
    if (user.username) return user.username;
    if (user.email) return user.email;
    return "Usuario";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-sm text-zinc-500">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Usuarios del Restaurante
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Gestiona quién tiene acceso al portal y con qué permisos
          </p>
        </div>
        {!isReadOnly && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir Usuario
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 rounded-md px-3 py-2">
          {success}
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && !isReadOnly && (
        <form
          onSubmit={handleCreateUser}
          className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Nuevo Usuario
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">
                Nombre de usuario *
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ej: ana, carlos"
                pattern="^[a-zA-Z0-9_-]{3,20}$"
                required
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-zinc-400">3-20 caracteres, sin espacios</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">
                Nombre a mostrar
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="ej: Ana García"
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">
                Contraseña *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">
                Rol *
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="waiter">Camarero</option>
                <option value="viewer">Solo lectura</option>
              </select>
              <p className="text-[10px] text-zinc-400">
                {ROLE_LABELS[newRole]?.description || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {creating ? "Creando..." : "Crear Usuario"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewUsername("");
                setNewPassword("");
                setNewRole("staff");
                setNewDisplayName("");
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">No hay usuarios configurados</p>
            <p className="text-xs mt-1">Añade usuarios para que puedan acceder al portal</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
                    {getUserIdentifier(user).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {getUserIdentifier(user)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {user.username && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        @{user.username}
                      </span>
                    )}
                    {user.email && !user.isLocalUser && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {user.email}
                      </span>
                    )}
                    {user.isLocalUser && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        Usuario local
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    ROLE_LABELS[user.role]?.color || "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {ROLE_LABELS[user.role]?.label || user.role}
                </span>

                {!isReadOnly && user.role !== "owner" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setEditRole(user.role);
                      }}
                      className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Editar rol"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Eliminar usuario"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Cambiar Rol
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Cambiar rol de <strong>{getUserIdentifier(editingUser)}</strong>
            </p>

            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="waiter">Camarero</option>
              <option value="viewer">Solo lectura</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Eliminar Usuario"
        description={`¿Estás seguro de que quieres eliminar a "${
          userToDelete ? getUserIdentifier(userToDelete) : ""
        }"? Esta acción no se puede deshacer.`}
        confirmText={deleting ? "Eliminando..." : "Eliminar"}
        confirmVariant="danger"
      />

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 mt-6">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Cómo funciona el acceso
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Los usuarios con <strong>nombre de usuario</strong> pueden acceder escribiendo solo su nombre y contraseña</li>
          <li>• Los usuarios con <strong>email real</strong> acceden con su email y contraseña</li>
          <li>• El <strong>Propietario</strong> tiene control total y no puede ser eliminado</li>
          <li>• Los <strong>Managers</strong> pueden gestionar reservas y ver estadísticas</li>
          <li>• El <strong>Staff</strong> puede ver y gestionar reservas del día</li>
        </ul>
      </div>
    </div>
  );
}
