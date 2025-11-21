"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAccessibleRestaurants, userHasRestaurantAccess } from "@/lib/getCurrentTenant";

import { redirect } from "next/navigation";

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
  restaurant_id: string; // NUEVO: Ahora es NOT NULL en la BD
  reminder_sent: boolean | null;
  restaurant_info?: {
    id: string;
    name: string;
    slug: string;
  };
};

type GetReservationsOpts = {
  tenantId: string;
  restaurantId?: string; // 👈 NUEVO: filtro opcional por restaurante específico
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursorCreatedAt?: string | null;
};

export async function getReservations(opts: GetReservationsOpts) {
  const { tenantId, restaurantId, q, status, from, to, limit = 50, cursorCreatedAt } = opts;
  const supabase = await supabaseServer();

  // NUEVO: Obtener restaurantes accesibles para el usuario
  const accessibleRestaurants = await getUserAccessibleRestaurants();
  const accessibleRestaurantIds = accessibleRestaurants.map((r) => r.restaurant_id);

  // Si el usuario no tiene acceso a ningún restaurante, devolver vacío
  if (accessibleRestaurantIds.length === 0) {
    return { data: [], nextCursor: null };
  }

  // Si viene restaurantId específico, verificar que el usuario tiene acceso
  let filterRestaurantIds = accessibleRestaurantIds;
  if (restaurantId) {
    // Verificar que el restaurantId solicitado está en la lista de accesibles
    if (accessibleRestaurantIds.includes(restaurantId)) {
      filterRestaurantIds = [restaurantId]; // Filtrar solo por este restaurante
    } else {
      // Usuario pidió un restaurante al que no tiene acceso → devolver vacío
      return { data: [], nextCursor: null };
    }
  }

  let query = supabase
    .from("reservations")
    .select(`
      *,
      restaurant_info:restaurant_id (
        id,
        name,
        slug
      )
    `)
    .eq("tenant_id", tenantId) // 👈 clave: filtramos por tenant_id
    .in("restaurant_id", filterRestaurantIds) // 👈 NUEVO: filtrar por restaurante(s) específico(s)
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
  restaurantId?: string; // 👈 NUEVO: filtro opcional por restaurante específico
};

export async function getReservationsSummary({
  tenantId,
  restaurantId, // 👈 NUEVO
}: GetReservationsSummaryOpts) {
  const supabase = await supabaseServer();
  const now = new Date();

  // NUEVO: Obtener restaurantes accesibles para el usuario
  const accessibleRestaurants = await getUserAccessibleRestaurants();
  const accessibleRestaurantIds = accessibleRestaurants.map((r) => r.restaurant_id);

  // Si el usuario no tiene acceso a ningún restaurante, devolver ceros
  if (accessibleRestaurantIds.length === 0) {
    return { today: 0, tomorrow: 0, weekRest: 0, monthRest: 0 };
  }

  // Si viene restaurantId específico, verificar que el usuario tiene acceso
  let filterRestaurantIds = accessibleRestaurantIds;
  if (restaurantId) {
    // Verificar que el restaurantId solicitado está en la lista de accesibles
    if (accessibleRestaurantIds.includes(restaurantId)) {
      filterRestaurantIds = [restaurantId]; // Filtrar solo por este restaurante
    } else {
      // Usuario pidió un restaurante al que no tiene acceso → devolver ceros
      return { today: 0, tomorrow: 0, weekRest: 0, monthRest: 0 };
    }
  }

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
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds) // 👈 Usar filterRestaurantIds (específico o todos)
    .gte("datetime_utc", startOfToday.toISOString())
    .lt("datetime_utc", startOfTomorrow.toISOString());

  const { count: tomorrow, error: tomorrowError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds) // 👈 Usar filterRestaurantIds
    .gte("datetime_utc", startOfTomorrow.toISOString())
    .lt("datetime_utc", startOfDayAfterTomorrow.toISOString());

  const { count: weekRest, error: weekRestError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds) // 👈 Usar filterRestaurantIds
    .gte("datetime_utc", startOfDayAfterTomorrow.toISOString())
    .lt("datetime_utc", startOfNextMonday.toISOString());

  const { count: monthRest, error: monthRestError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds) // 👈 Usar filterRestaurantIds
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
 * - name
 * - phone
 * - party_size
 * - notes
 * - datetime_utc
 */
export async function updateReservationDetails(params: {
  reservationId: string;
  name?: string;
  phone?: string | null;
  party_size?: number | null;
  notes?: string | null;
  datetime_utc?: string;
}) {
  const supabase = await supabaseServer();
  const { reservationId, name, phone, party_size, notes, datetime_utc } = params;

  const payload: Record<string, any> = {};
  if (name !== undefined) payload.name = name;
  if (phone !== undefined) payload.phone = phone;
  if (party_size !== undefined) payload.party_size = party_size;
  if (notes !== undefined) payload.notes = notes;
  if (datetime_utc !== undefined) payload.datetime_utc = datetime_utc;

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

export type CreateReservationInput = {
  tenantId: string;
  restaurantId?: string; // Opcional: si no se pasa, se obtiene automáticamente (solo válido para tenants de 1 restaurante)
  name: string;
  phone?: string | null;
  party_size: number;
  datetime_utc: string;
  notes?: string | null;
  source?: string | null;
  tz?: string | null;
  status?: string;
};

export async function createReservation(input: CreateReservationInput) {
  const supabase = await supabaseServer();

  const {
    tenantId,
    restaurantId,
    name,
    phone = null,
    party_size,
    datetime_utc,
    notes = null,
    source = "phone",
    tz = "Europe/Zurich",
    status = "confirmed",
  } = input;

  // Resolver restaurant_id
  let finalRestaurantId = restaurantId;

  if (!finalRestaurantId) {
    // Si no se pasó restaurant_id, intentar obtener automáticamente
    // SOLO válido para tenants con 1 solo restaurante
    const accessibleRestaurants = await getUserAccessibleRestaurants();

    if (accessibleRestaurants.length === 0) {
      throw new Error("No tienes acceso a ningún restaurante");
    }

    if (accessibleRestaurants.length > 1) {
      throw new Error(
        "Tienes acceso a múltiples restaurantes. Debes especificar restaurant_id explícitamente."
      );
    }

    finalRestaurantId = accessibleRestaurants[0].restaurant_id;
  } else {
    // Si se pasó restaurant_id, verificar que el usuario tiene acceso
    const hasAccess = await userHasRestaurantAccess(finalRestaurantId);
    if (!hasAccess) {
      throw new Error("No tienes permiso para crear reservas en este restaurante");
    }
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: tenantId,
      restaurant_id: finalRestaurantId,
      name,
      phone,
      party_size,
      datetime_utc,
      notes,
      source,
      tz,
      status,
      reminder_sent: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating reservation:", error);
    throw new Error("Failed to create reservation");
  }

  return data as Reservation;
}

/**
 * Obtiene información del tenant (si es multi-restaurant y cuántos tiene)
 */
export async function getTenantInfo(tenantId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("tenants")
    .select("is_multi_restaurant, restaurant_count")
    .eq("id", tenantId)
    .single();

  if (error) {
    console.error("Error getting tenant info:", error);
    return { is_multi_restaurant: false, restaurant_count: 1 };
  }

  return {
    is_multi_restaurant: data.is_multi_restaurant ?? false,
    restaurant_count: data.restaurant_count ?? 1,
  };
}

/**
 * Obtiene la lista de restaurantes de un tenant (filtrado por permisos del usuario)
 */
export async function getRestaurants(tenantId: string) {
  const supabase = await supabaseServer();

  // NUEVO: Obtener solo los restaurantes a los que el usuario tiene acceso
  const accessibleRestaurants = await getUserAccessibleRestaurants();
  const accessibleRestaurantIds = accessibleRestaurants.map((r) => r.restaurant_id);

  if (accessibleRestaurantIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("restaurant_info")
    .select("id, name, slug, phone")
    .eq("tenant_id", tenantId)
    .in("id", accessibleRestaurantIds) // 👈 NUEVO: filtrar por restaurantes accesibles
    .order("name");

  if (error) {
    console.error("Error getting restaurants:", error);
    throw new Error("Failed to get restaurants");
  }

  return data as Array<{
    id: string;
    name: string;
    slug: string;
    phone: string | null;
  }>;
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}