import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCurrentTenantId } from "@/lib/getCurrentTenant";
import DashboardShell from "./dashboard-shell";
import { SummaryCards } from "./summary-cards";
import { ReservationsView } from "./reservations-view";
import { Plus } from "lucide-react"; // arriba del todo



export default async function Page() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?redirectTo=/`);
  }

  const { tenantId } = await getCurrentTenantId();
  const defaultTz = "Europe/Zurich";

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        <div className="relative">
          <div className="pt-6">
            <SummaryCards tenantId={tenantId} />
          </div>
        </div>

        <section className="mt-6">
          <ReservationsView tenantId={tenantId} defaultTz={defaultTz} />
        </section>
      </div>
    </DashboardShell>
  );
}


