import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components / Server Actions
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ANON / publishable key
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Si se llama desde un Server Component puro y no deja escribir cookies,
            // no pasa nada para leer el usuario con auth.getUser()
          }
        },
      },
    }
  );
}

// Alias opcional por si más adelante quieres usarlo con otro nombre
export const createSupabaseServerClient = supabaseServer;
