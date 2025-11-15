"use server";

import { supabaseServer } from "@/lib/supabaseServer";

export type Reservation = {
  id: string;
  phone: string | null;
  name: string;
  source: string | null;
  created_at: string;
  status: string;
  business_id: string | null;
  tz: string | null;
  chat_id: string | null;
  locator: string | null;
  party_size: number | null;
  datetime_utc: string;
  notes: string | null;
  tenant_id: string | null;
  reminder_sent: boolean | null;
};

type GetReservationsOpts = {
  tenantId: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursorCreatedAt?: string | null;
};

export async function getReservations(opts: GetReservationsOpts) {
  const { tenantId, q, status, from, to, limit = 50, cursorCreatedAt } = opts;
  const supabase = await supabaseServer();

  let query = supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId) // 👈 clave: filtramos por tenant_id
    .order("datetime_utc", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (from) {
    query = query.gte("datetime_utc", from);
  }

  if (to) {
    query = query.lte("datetime_utc", to);
  }

  if (q && q.trim()) {
    const safeQ = q.trim();
    query = query.or(
      `name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%,notes.ilike.%${safeQ}%,locator.ilike.%${safeQ}%`
    );
  }

  if (cursorCreatedAt) {
    // paginación por fecha
    query = query.lt("datetime_utc", cursorCreatedAt);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error en getReservations:", error);
    throw new Error(error.message);
  }

  const rows = (data as Reservation[]) ?? [];
  const nextCursor =
    rows.length === limit ? rows[rows.length - 1]?.datetime_utc ?? null : null;

  return { data: rows, nextCursor };
}

type GetReservationsSummaryOpts = {
  tenantId: string;
};

export async function getReservationsSummary({
  tenantId,
}: GetReservationsSummaryOpts) {
  const supabase = await supabaseServer();
  const now = new Date();

  // Fechas en UTC
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startOfTomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const startOfDayAfterTomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
  );

  const todayWeekday = startOfToday.getUTCDay(); // 0=domingo...
  const daysUntilNextMonday = (8 - todayWeekday) % 7 || 7;
  const startOfNextMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilNextMonday
    )
  );

  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const { count: today, error: todayError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId) // 👈 antes business_id
    .gte("datetime_utc", startOfToday.toISOString())
    .lt("datetime_utc", startOfTomorrow.toISOString());

  const { count: tomorrow, error: tomorrowError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("datetime_utc", startOfTomorrow.toISOString())
    .lt("datetime_utc", startOfDayAfterTomorrow.toISOString());

  const { count: weekRest, error: weekRestError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("datetime_utc", startOfDayAfterTomorrow.toISOString())
    .lt("datetime_utc", startOfNextMonday.toISOString());

  const { count: monthRest, error: monthRestError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("datetime_utc", startOfDayAfterTomorrow.toISOString())
    .lt("datetime_utc", startOfNextMonth.toISOString());

  if (todayError || tomorrowError || weekRestError || monthRestError) {
    console.error("Error obteniendo summary", {
      todayError,
      tomorrowError,
      weekRestError,
      monthRestError,
    });
  }

  return {
    today: today ?? 0,
    tomorrow: tomorrow ?? 0,
    weekRest: weekRest ?? 0,
    monthRest: monthRest ?? 0,
  };
}

/* ------------------------------------------------------------------
 * NUEVAS SERVER ACTIONS (PASO 1)
 * ------------------------------------------------------------------*/

/**
 * Cambia el estado de una reserva (pending, confirmed, seated, cancelled, no_show, finished).
 */
export async function updateReservationStatus(params: {
  reservationId: string;
  status: string;
}) {
  const supabase = await supabaseServer();
  const { reservationId, status } = params;

  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", reservationId);

  if (error) {
    console.error("Error updating reservation status:", error);
    throw new Error("Failed to update reservation status");
  }

  return { ok: true };
}

/**
 * Actualiza campos editables básicos de una reserva:
 * - phone
 * - party_size
 * - notes
 */
export async function updateReservationDetails(params: {
  reservationId: string;
  phone?: string | null;
  party_size?: number | null;
  notes?: string | null;
}) {
  const supabase = await supabaseServer();
  const { reservationId, phone, party_size, notes } = params;

  const payload: Record<string, any> = {};
  if (phone !== undefined) payload.phone = phone;
  if (party_size !== undefined) payload.party_size = party_size;
  if (notes !== undefined) payload.notes = notes;

  const { error } = await supabase
    .from("reservations")
    .update(payload)
    .eq("id", reservationId);

  if (error) {
    console.error("Error updating reservation details:", error);
    throw new Error("Failed to update reservation details");
  }

  return { ok: true };
}