// API for user management (list, create, update, delete)
// Users are created with email + password (email can be fictitious)
// v1.5 - Fixed role mapping for user_restaurants (only allows manager, staff, viewer)
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Map frontend roles to user_restaurants roles (check constraint only allows: manager, staff, viewer)
// admin -> they become tenant admin, skip user_restaurants (they see all restaurants)
// waiter -> mapped to staff
function mapToRestaurantRole(frontendRole: string): string | null {
  const roleMap: Record<string, string | null> = {
    admin: null,        // Admins don't need user_restaurants entry (they see all via tenant_users)
    manager: "manager",
    staff: "staff",
    waiter: "staff",    // waiter is a type of staff
    viewer: "viewer",
  };
  return roleMap[frontendRole] ?? "staff";
}

// GET: List users for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Missing restaurantId parameter" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Get current user to verify permissions
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Get current user's tenant and role
    const { data: currentTenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (tenantError || !currentTenantUser) {
      return NextResponse.json(
        { error: "Usuario sin tenant asociado" },
        { status: 403 }
      );
    }

    // Only owner, admin, group_manager can view users
    const allowedRoles = ["owner", "admin", "group_manager"];
    if (!allowedRoles.includes(currentTenantUser.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para ver usuarios" },
        { status: 403 }
      );
    }

    // Get users with access to this restaurant
    const { data: restaurantAccess, error: accessError } = await supabase
      .from("user_restaurants")
      .select("auth_user_id")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true);

    if (accessError) {
      console.error("[Users API] Error fetching restaurant access:", accessError);
      return NextResponse.json(
        { error: "Error obteniendo accesos" },
        { status: 500 }
      );
    }

    const userIds = restaurantAccess?.map((a) => a.auth_user_id) || [];

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get tenant_users info for these users
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from("tenant_users")
      .select("auth_user_id, role, display_name, created_at")
      .eq("tenant_id", currentTenantUser.tenant_id)
      .in("auth_user_id", userIds);

    if (tenantUsersError) {
      console.error("[Users API] Error fetching tenant users:", tenantUsersError);
      return NextResponse.json(
        { error: "Error obteniendo usuarios" },
        { status: 500 }
      );
    }

    // Get email from Supabase Auth for each user
    const usersWithEmail = await Promise.all(
      (tenantUsers || []).map(async (tu) => {
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(
          tu.auth_user_id
        );

        const email = authData?.user?.email || "";

        return {
          id: tu.auth_user_id,
          email: email,
          displayName: tu.display_name,
          role: tu.role,
          createdAt: tu.created_at,
        };
      })
    );

    return NextResponse.json({ users: usersWithEmail });
  } catch (error) {
    console.error("[Users API] Fatal error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Create a new user with email + password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, email, password, role, displayName } = body;

    if (!restaurantId || !email || !password || !role) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (restaurantId, email, password, role)" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "manager", "staff", "waiter", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Get current user to verify permissions
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Get current user's tenant and role
    const { data: currentTenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (tenantError || !currentTenantUser) {
      return NextResponse.json(
        { error: "Usuario sin tenant asociado" },
        { status: 403 }
      );
    }

    // Only owner, admin, or group_manager can create users
    const canManageUsers = ["owner", "admin", "group_manager"].includes(currentTenantUser.role);
    if (!canManageUsers) {
      return NextResponse.json(
        { error: "No tienes permisos para crear usuarios" },
        { status: 403 }
      );
    }

    const tenantId = currentTenantUser.tenant_id;

    // Check if email already exists in Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase());

    if (existingUser) {
      // Check if already in this tenant
      const { data: existingTenantUser } = await supabase
        .from("tenant_users")
        .select("id")
        .eq("auth_user_id", existingUser.id)
        .eq("tenant_id", tenantId)
        .single();

      if (existingTenantUser) {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese email en este restaurante" },
          { status: 409 }
        );
      }
    }

    // Create user in Supabase Auth with password (ready to login immediately)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm since admin is creating the user
      user_metadata: {
        display_name: displayName || email.split("@")[0],
        role: role,
        tenant_id: tenantId,
        created_via: "portal",
      },
    });

    if (authError) {
      console.error("[Users API] Error creating auth user:", authError);

      // Handle duplicate email error
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese email" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Error creando usuario: ${authError.message}` },
        { status: 500 }
      );
    }

    const authUserId = authUser.user.id;

    // Insert into tenant_users (use admin client to bypass RLS)
    const userName = displayName || email.split("@")[0];
    const { error: tenantUserError } = await supabaseAdmin
      .from("tenant_users")
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenantId,
        email: email.toLowerCase(),
        role: role,
        name: userName,
        display_name: userName,
      });

    if (tenantUserError) {
      console.error("[Users API] Error inserting tenant_user:", tenantUserError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: "Error vinculando usuario al tenant" },
        { status: 500 }
      );
    }

    // Insert into user_restaurants (use admin client to bypass RLS)
    // Map the frontend role to a valid user_restaurants role (manager, staff, viewer)
    // Admin users don't need user_restaurants entry - they see all restaurants via tenant_users role
    const restaurantRole = mapToRestaurantRole(role);

    if (restaurantRole !== null) {
      const { error: accessError } = await supabaseAdmin
        .from("user_restaurants")
        .insert({
          auth_user_id: authUserId,
          restaurant_id: restaurantId,
          tenant_id: tenantId,
          role: restaurantRole,
          is_active: true,
        });

      if (accessError) {
        console.error("[Users API] Error granting restaurant access:", accessError);
        console.error("[Users API] Insert data was:", { auth_user_id: authUserId, restaurant_id: restaurantId, tenant_id: tenantId, role: restaurantRole });
        // Rollback: delete from tenant_users and auth
        await supabaseAdmin.from("tenant_users").delete().eq("auth_user_id", authUserId);
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        return NextResponse.json(
          { error: `Error asignando usuario al restaurante: ${accessError.message}` },
          { status: 500 }
        );
      }
    } else {
      console.log(`[Users API] User ${email} is admin - skipping user_restaurants (has full tenant access)`);
    }

    console.log(`[Users API] User created: ${email} (${role}) for restaurant ${restaurantId}`);

    return NextResponse.json({
      success: true,
      user: {
        id: authUserId,
        email: email.toLowerCase(),
        displayName: displayName || email.split("@")[0],
        role: role,
      },
    });
  } catch (error) {
    console.error("[Users API] Fatal error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const restaurantId = searchParams.get("restaurantId");

    if (!userId || !restaurantId) {
      return NextResponse.json(
        { error: "Faltan parámetros (userId, restaurantId)" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Get current user to verify permissions
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Prevent self-deletion
    if (user.id === userId) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 }
      );
    }

    // Get current user's tenant and role
    const { data: currentTenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (tenantError || !currentTenantUser) {
      return NextResponse.json(
        { error: "Usuario sin tenant asociado" },
        { status: 403 }
      );
    }

    // Only owner, admin, or group_manager can delete users
    const canManageUsers = ["owner", "admin", "group_manager"].includes(currentTenantUser.role);
    if (!canManageUsers) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar usuarios" },
        { status: 403 }
      );
    }

    // Verify the user to delete belongs to the same tenant
    const { data: targetUser, error: targetError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("auth_user_id", userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (targetUser.tenant_id !== currentTenantUser.tenant_id) {
      return NextResponse.json(
        { error: "No puedes eliminar usuarios de otro tenant" },
        { status: 403 }
      );
    }

    // Cannot delete owner
    if (targetUser.role === "owner") {
      return NextResponse.json(
        { error: "No se puede eliminar al propietario" },
        { status: 403 }
      );
    }

    // Remove restaurant access (soft delete by setting is_active = false)
    const { error: accessDeleteError } = await supabase
      .from("user_restaurants")
      .update({ is_active: false })
      .eq("auth_user_id", userId)
      .eq("restaurant_id", restaurantId);

    if (accessDeleteError) {
      console.error("[Users API] Error removing restaurant access:", accessDeleteError);
    }

    // Check if user has access to other active restaurants
    const { data: otherAccess } = await supabase
      .from("user_restaurants")
      .select("id")
      .eq("auth_user_id", userId)
      .eq("is_active", true);

    // If no other restaurant access, delete the user completely
    if (!otherAccess || otherAccess.length === 0) {
      // Delete from tenant_users
      const { error: tenantDeleteError } = await supabase
        .from("tenant_users")
        .delete()
        .eq("auth_user_id", userId);

      if (tenantDeleteError) {
        console.error("[Users API] Error deleting tenant_user:", tenantDeleteError);
      }

      // Delete from Supabase Auth
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error("[Users API] Error deleting auth user:", authDeleteError);
      }

      console.log(`[Users API] User ${userId} completely deleted`);
    } else {
      console.log(`[Users API] User ${userId} removed from restaurant ${restaurantId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Users API] Fatal error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH: Update user role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, displayName } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Falta userId" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Get current user to verify permissions
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Get current user's tenant and role
    const { data: currentTenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (tenantError || !currentTenantUser) {
      return NextResponse.json(
        { error: "Usuario sin tenant asociado" },
        { status: 403 }
      );
    }

    // Only owner, admin, or group_manager can change roles
    const canManageUsers = ["owner", "admin", "group_manager"].includes(currentTenantUser.role);
    if (!canManageUsers) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar usuarios" },
        { status: 403 }
      );
    }

    // Verify the user to update belongs to the same tenant
    const { data: targetUser, error: targetError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("auth_user_id", userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (targetUser.tenant_id !== currentTenantUser.tenant_id) {
      return NextResponse.json(
        { error: "No puedes modificar usuarios de otro tenant" },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Record<string, string> = {};
    if (role) {
      const validRoles = ["admin", "manager", "staff", "waiter", "viewer"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: "Rol inválido" },
          { status: 400 }
        );
      }
      updates.role = role;
    }
    if (displayName) {
      updates.display_name = displayName;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No hay cambios que aplicar" },
        { status: 400 }
      );
    }

    // Update tenant_users
    const { error: updateError } = await supabase
      .from("tenant_users")
      .update(updates)
      .eq("auth_user_id", userId);

    if (updateError) {
      console.error("[Users API] Error updating user:", updateError);
      return NextResponse.json(
        { error: "Error actualizando usuario" },
        { status: 500 }
      );
    }

    console.log(`[Users API] User ${userId} updated:`, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Users API] Fatal error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
