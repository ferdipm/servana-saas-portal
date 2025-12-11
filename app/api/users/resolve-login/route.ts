// API to resolve username to email for login
// This allows users to login with just username instead of full email
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role client for looking up users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: "Missing identifier" },
        { status: 400 }
      );
    }

    // If identifier contains @, it's already an email
    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier });
    }

    // Otherwise, search for username in tenant_users
    const username = identifier.toLowerCase().trim();

    // Query tenant_users by username
    const { data: tenantUser, error: tenantError } = await supabaseAdmin
      .from("tenant_users")
      .select("auth_user_id")
      .eq("username", username)
      .single();

    if (tenantError || !tenantUser) {
      // Username not found - return generic error to avoid enumeration
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Get email from Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      tenantUser.auth_user_id
    );

    if (authError || !authUser?.user?.email) {
      return NextResponse.json(
        { error: "Error obteniendo credenciales" },
        { status: 500 }
      );
    }

    // Return the email to use for login
    return NextResponse.json({ email: authUser.user.email });
  } catch (error) {
    console.error("[Resolve Login API] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
