// app/pending/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCurrentTenantId } from "@/lib/getCurrentTenant";
import DashboardShell from "../dashboard-shell";
import { ReservationsView } from "../reservations-view";

export default async function PendingPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // 🔐 Mismo patrón que en app/page.tsx
  if (error || !user) {
    redirect(`/login?redirectTo=/pending`);
  }

  const { tenantId } = await getCurrentTenantId();
  const defaultTz = "Europe/Zurich";

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        <header className="mb-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Reservas pendientes
          </h1>
          <p className="text-sm text-zinc-500">
            Solicitudes que requieren revisión y confirmación manual.
          </p>
        </header>

        <section className="mt-4">
          <ReservationsView
            tenantId={tenantId}
            defaultTz={defaultTz}
            initialStatus="pending"  // 👈 Aquí está la magia
          />
        </section>
      </div>
    </DashboardShell>
  );
}