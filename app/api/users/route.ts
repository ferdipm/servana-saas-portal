// API for user management (list, create, update, delete)
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper to generate fictitious email from username
function generateFictitiousEmail(username: string, tenantId: string): string {
  // Clean username: lowercase, no spaces, alphanumeric only
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Use first 8 chars of tenant ID for shorter email
  const shortTenantId = tenantId.replace(/-/g, "").substring(0, 8);
  return `${cleanUsername}@${shortTenantId}.servana.local`;
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
      .from("user_restaurant_access")
      .select("user_id")
      .eq("restaurant_id", restaurantId);

    if (accessError) {
      console.error("[Users API] Error fetching restaurant access:", accessError);
      return NextResponse.json(
        { error: "Error obteniendo accesos" },
        { status: 500 }
      );
    }

    const userIds = restaurantAccess?.map((a) => a.user_id) || [];

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get tenant_users info for these users
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from("tenant_users")
      .select("auth_user_id, role, username, display_name, created_at")
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

        // Determine display identifier
        let displayIdentifier = tu.username || tu.display_name;
        let email = authData?.user?.email || "";
        let isLocalUser = email.endsWith(".servana.local");

        if (!displayIdentifier && !isLocalUser) {
          displayIdentifier = email;
        }

        return {
          id: tu.auth_user_id,
          username: tu.username,
          displayName: tu.display_name,
          email: isLocalUser ? null : email, // Don't show fictitious emails
          role: tu.role,
          createdAt: tu.created_at,
          isLocalUser,
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

// POST: Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, username, password, role, displayName } = body;

    if (!restaurantId || !username || !password || !role) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (restaurantId, username, password, role)" },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "El nombre de usuario debe tener 3-20 caracteres (letras, números, guiones)" },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["owner", "manager", "staff", "waiter", "viewer"];
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

    // Only owner can create users
    if (currentTenantUser.role !== "owner" && currentTenantUser.role !== "admin") {
      return NextResponse.json(
        { error: "Solo el propietario puede crear usuarios" },
        { status: 403 }
      );
    }

    const tenantId = currentTenantUser.tenant_id;

    // Check if username already exists in this tenant
    const { data: existingUser, error: existingError } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("username", username.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese nombre" },
        { status: 409 }
      );
    }

    // Generate fictitious email
    const fictitiousEmail = generateFictitiousEmail(username, tenantId);

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: fictitiousEmail,
      password: password,
      email_confirm: true, // Auto-confirm since it's a fictitious email
      user_metadata: {
        username: username.toLowerCase(),
        display_name: displayName || username,
        role: role,
        tenant_id: tenantId,
        created_via: "portal",
      },
    });

    if (authError) {
      console.error("[Users API] Error creating auth user:", authError);
      return NextResponse.json(
        { error: `Error creando usuario: ${authError.message}` },
        { status: 500 }
      );
    }

    const authUserId = authUser.user.id;

    // Insert into tenant_users
    const { error: tenantUserError } = await supabase
      .from("tenant_users")
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenantId,
        role: role,
        username: username.toLowerCase(),
        display_name: displayName || username,
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

    // Insert into user_restaurant_access
    const { error: accessError } = await supabase
      .from("user_restaurant_access")
      .insert({
        user_id: authUserId,
        restaurant_id: restaurantId,
      });

    if (accessError) {
      console.error("[Users API] Error granting restaurant access:", accessError);
      // Don't rollback - user is created, just missing restaurant access
    }

    console.log(`[Users API] User created: ${username} (${role}) for restaurant ${restaurantId}`);

    return NextResponse.json({
      success: true,
      user: {
        id: authUserId,
        username: username.toLowerCase(),
        displayName: displayName || username,
        role: role,
        isLocalUser: true,
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

    // Only owner can delete users
    if (currentTenantUser.role !== "owner" && currentTenantUser.role !== "admin") {
      return NextResponse.json(
        { error: "Solo el propietario puede eliminar usuarios" },
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

    // Cannot delete another owner
    if (targetUser.role === "owner" && currentTenantUser.role !== "owner") {
      return NextResponse.json(
        { error: "No puedes eliminar a un propietario" },
        { status: 403 }
      );
    }

    // Remove restaurant access
    const { error: accessDeleteError } = await supabase
      .from("user_restaurant_access")
      .delete()
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId);

    if (accessDeleteError) {
      console.error("[Users API] Error removing restaurant access:", accessDeleteError);
    }

    // Check if user has access to other restaurants
    const { data: otherAccess, error: otherAccessError } = await supabase
      .from("user_restaurant_access")
      .select("id")
      .eq("user_id", userId);

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
      console.log(`[Users API] User ${userId} removed from restaurant ${restaurantId}, but has access to ${otherAccess.length} other restaurants`);
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

    // Only owner can change roles
    if (currentTenantUser.role !== "owner" && currentTenantUser.role !== "admin") {
      return NextResponse.json(
        { error: "Solo el propietario puede modificar usuarios" },
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
      const validRoles = ["owner", "manager", "staff", "waiter", "viewer"];
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
