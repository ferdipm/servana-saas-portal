"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirectTo") || "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Login OK → al dashboard (o a redirectTo si viene en la URL)
      router.push(redirectTo);
    } catch (err: any) {
      setError("Ha ocurrido un error inesperado al iniciar sesión.");
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border p-8 shadow-lg bg-card">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          Servana IA · Panel
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Inicia sesión con tu cuenta de restaurante
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@restaurante.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/5 border border-red-500/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          De momento el alta de usuarios la gestionamos desde el panel de
          Supabase (invitaciones manuales).
        </p>
      </div>
    </div>
  );
}
