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
  // Campos de confirmación
  confirmation_status: 'not_required' | 'pending' | 'confirmed' | 'declined' | 'no_response' | null;
  confirmation_sent_at: string | null;
  confirmation_replied_at: string | null;
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
    .order("datetime_utc", { ascending: true }) // 👈 CAMBIADO: orden ascendente (más temprano primero)
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

  // Calcular fechas basadas en la zona horaria de España (Europe/Madrid)
  // Convertir la hora actual a timezone de España para saber qué día es "hoy" allí
  const spainTimeString = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const spainTime = new Date(spainTimeString);

  // Inicio y fin del día "hoy" en España, pero expresado en UTC
  // Ejemplo: Si en España son las 00:30 del 29, "hoy" es 29, que empieza en UTC a las 23:00 del 28
  const startOfToday = new Date(Date.UTC(
    spainTime.getFullYear(),
    spainTime.getMonth(),
    spainTime.getDate(),
    0, 0, 0, 0
  ));
  // Ajustar por el offset de España (GMT+1 en invierno, GMT+2 en verano)
  const spainOffset = -spainTime.getTimezoneOffset() / 60; // En horas
  startOfToday.setUTCHours(startOfToday.getUTCHours() - spainOffset);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  const startOfDayAfterTomorrow = new Date(startOfToday);
  startOfDayAfterTomorrow.setUTCDate(startOfDayAfterTomorrow.getUTCDate() + 2);

  const todayWeekday = spainTime.getDay(); // 0=domingo...
  const daysUntilNextMonday = (8 - todayWeekday) % 7 || 7;
  const startOfNextMonday = new Date(startOfToday);
  startOfNextMonday.setUTCDate(startOfNextMonday.getUTCDate() + daysUntilNextMonday);

  const startOfMonth = new Date(Date.UTC(
    spainTime.getFullYear(),
    spainTime.getMonth(),
    1,
    0, 0, 0, 0
  ));
  startOfMonth.setUTCHours(startOfMonth.getUTCHours() - spainOffset);

  const startOfNextMonth = new Date(Date.UTC(
    spainTime.getFullYear(),
    spainTime.getMonth() + 1,
    1,
    0, 0, 0, 0
  ));
  startOfNextMonth.setUTCHours(startOfNextMonth.getUTCHours() - spainOffset);

  // DEBUG: Log para verificar qué estamos consultando
  console.log('[getReservationsSummary] Consultando reservas para hoy:', {
    tenantId,
    filterRestaurantIds,
    startOfToday: startOfToday.toISOString(),
    startOfTomorrow: startOfTomorrow.toISOString(),
  });

  const { count: today, error: todayError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds)
    .gte("datetime_utc", startOfToday.toISOString())
    .lt("datetime_utc", startOfTomorrow.toISOString())
    .in("status", ["confirmed", "seated", "finished"]); // 👈 Incluir confirmadas, sentadas y finalizadas

  console.log('[getReservationsSummary] Resultado para hoy:', { today, todayError });

  const { count: tomorrow, error: tomorrowError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds)
    .gte("datetime_utc", startOfTomorrow.toISOString())
    .lt("datetime_utc", startOfDayAfterTomorrow.toISOString())
    .in("status", ["confirmed", "seated", "finished"]); // 👈 Incluir confirmadas, sentadas y finalizadas

  const { count: weekRest, error: weekRestError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds)
    .gte("datetime_utc", startOfDayAfterTomorrow.toISOString())
    .lt("datetime_utc", startOfNextMonday.toISOString())
    .in("status", ["confirmed", "seated", "finished"]); // 👈 Incluir confirmadas, sentadas y finalizadas

  const { count: monthRest, error: monthRestError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds)
    .gte("datetime_utc", startOfDayAfterTomorrow.toISOString())
    .lt("datetime_utc", startOfNextMonth.toISOString())
    .in("status", ["confirmed", "seated", "finished"]); // 👈 Incluir confirmadas, sentadas y finalizadas

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

/**
 * Obtiene el conteo de TODAS las reservas pendientes (sin filtro de fecha)
 */
export async function getPendingTodayCount(opts: {
  tenantId: string;
  restaurantId?: string;
}) {
  const { tenantId, restaurantId } = opts;
  const supabase = await supabaseServer();

  // Obtener restaurantes accesibles para el usuario
  const accessibleRestaurants = await getUserAccessibleRestaurants();
  const accessibleRestaurantIds = accessibleRestaurants.map((r) => r.restaurant_id);

  if (accessibleRestaurantIds.length === 0) {
    return 0;
  }

  // Filtrar por restaurante específico o todos accesibles
  let filterRestaurantIds = accessibleRestaurantIds;
  if (restaurantId && accessibleRestaurantIds.includes(restaurantId)) {
    filterRestaurantIds = [restaurantId];
  }

  // Contar TODAS las reservas pendientes (sin filtro de fecha)
  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("restaurant_id", filterRestaurantIds)
    .eq("status", "pending");

  return count ?? 0;
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

  // Generar token de check-in automáticamente para reservas confirmadas
  const checkinToken = status === "confirmed" ? generateCheckinToken() : null;

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
      checkin_token: checkinToken,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating reservation:", error);
    throw new Error("Failed to create reservation");
  }

  const reservation = data as Reservation;

  // Si tiene teléfono y está confirmada, enviar confirmación por WhatsApp con QR
  if (phone && status === "confirmed" && checkinToken) {
    try {
      await sendReservationConfirmationWithQR({
        reservationId: reservation.id,
        phone,
        name,
        partySize: party_size,
        datetimeUtc: datetime_utc,
        tz: tz || "Europe/Zurich",
        checkinToken,
        restaurantId: finalRestaurantId,
      });
    } catch (err) {
      // No fallar la reserva si falla el envío de WhatsApp
      console.error("Error sending WhatsApp confirmation:", err);
    }
  }

  return reservation;
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

/**
 * Tipo para un turno de restaurante
 */
export type Shift = {
  name: string;
  emoji: string;
  startTime: string;
  endTime: string;
};

/**
 * Obtiene los turnos configurados para un restaurante basado en opening_hours
 * Los turnos se detectan por hora:
 * - Desayuno: 7:00-12:00
 * - Comida: 12:00-17:00
 * - Cena: 19:00+
 */
export async function getRestaurantShifts(restaurantId: string): Promise<Shift[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("restaurant_info")
    .select("opening_hours")
    .eq("id", restaurantId)
    .single();

  if (error || !data?.opening_hours) {
    return [];
  }

  const openingHours = data.opening_hours as Record<string, string>;

  // Obtener día actual en español
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const today = new Date();
  const todayName = dayNames[today.getDay()];

  const todayHours = openingHours[todayName];
  if (!todayHours || todayHours === "Cerrado") {
    return [];
  }

  // Parsear los rangos de horas
  const shifts: Shift[] = [];
  const ranges = todayHours.split(",");

  ranges.forEach((range: string) => {
    const [start, end] = range.trim().split("-");
    if (!start || !end) return;

    const startHour = parseInt(start.split(":")[0]);

    let shiftName = "Turno";
    let shiftEmoji = "⏰";

    if (startHour >= 7 && startHour < 12) {
      shiftName = "Desayuno";
      shiftEmoji = "☕";
    } else if (startHour >= 12 && startHour < 17) {
      shiftName = "Comida";
      shiftEmoji = "🍽️";
    } else if (startHour >= 19 || startHour < 2) {
      shiftName = "Cena";
      shiftEmoji = "🌙";
    }

    shifts.push({
      name: shiftName,
      emoji: shiftEmoji,
      startTime: start,
      endTime: end,
    });
  });

  return shifts;
}

/**
 * Obtiene los turnos para una fecha específica (considera días especiales)
 */
export async function getRestaurantShiftsForDate(
  restaurantId: string,
  date: Date
): Promise<Shift[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("restaurant_info")
    .select("opening_hours, special_days")
    .eq("id", restaurantId)
    .single();

  if (error || !data?.opening_hours) {
    return [];
  }

  const openingHours = data.opening_hours as Record<string, string>;
  const specialDays = (data.special_days || []) as Array<{
    date: string;
    type: string;
    hours?: string;
  }>;

  // Formatear fecha para comparar con special_days
  const dateStr = date.toISOString().split("T")[0];

  // Verificar si hay día especial
  const specialDay = specialDays.find((sd) => sd.date === dateStr);

  let hoursString: string | null = null;

  if (specialDay) {
    if (specialDay.type === "closed") {
      return []; // Día cerrado
    }
    if (specialDay.type === "special_hours" && specialDay.hours) {
      hoursString = specialDay.hours;
    }
  }

  // Si no hay día especial, usar horario regular
  if (!hoursString) {
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = dayNames[date.getDay()];
    hoursString = openingHours[dayName];
  }

  if (!hoursString || hoursString === "Cerrado") {
    return [];
  }

  // Parsear los rangos de horas
  const shifts: Shift[] = [];
  const ranges = hoursString.split(",");

  ranges.forEach((range: string) => {
    const [start, end] = range.trim().split("-");
    if (!start || !end) return;

    const startHour = parseInt(start.split(":")[0]);

    let shiftName = "Turno";
    let shiftEmoji = "⏰";

    if (startHour >= 7 && startHour < 12) {
      shiftName = "Desayuno";
      shiftEmoji = "☕";
    } else if (startHour >= 12 && startHour < 17) {
      shiftName = "Comida";
      shiftEmoji = "🍽️";
    } else if (startHour >= 19 || startHour < 2) {
      shiftName = "Cena";
      shiftEmoji = "🌙";
    }

    shifts.push({
      name: shiftName,
      emoji: shiftEmoji,
      startTime: start,
      endTime: end,
    });
  });

  return shifts;
}

/* ------------------------------------------------------------------
 * QR CHECK-IN FUNCTIONS
 * ------------------------------------------------------------------*/

import { generateCheckinToken, generateCheckinQRCode } from "@/lib/qr-utils";

/**
 * Asigna un token de check-in a una reserva existente
 * Devuelve el QR code como Data URL
 */
export async function assignCheckinToken(reservationId: string): Promise<{
  token: string;
  qrDataUrl: string;
}> {
  const supabase = await supabaseServer();

  // Generar nuevo token
  const token = generateCheckinToken();

  // Guardar en la BD
  const { error } = await supabase
    .from("reservations")
    .update({ checkin_token: token })
    .eq("id", reservationId);

  if (error) {
    console.error("Error assigning checkin token:", error);
    throw new Error("Failed to assign checkin token");
  }

  // Generar QR
  const qrDataUrl = await generateCheckinQRCode(token);

  return { token, qrDataUrl };
}

/**
 * Obtiene el QR de check-in para una reserva.
 * Si no tiene token, genera uno nuevo.
 */
export async function getOrCreateCheckinQR(reservationId: string): Promise<{
  token: string;
  qrDataUrl: string;
}> {
  const supabase = await supabaseServer();

  // Verificar si ya tiene token
  const { data, error } = await supabase
    .from("reservations")
    .select("checkin_token")
    .eq("id", reservationId)
    .single();

  if (error) {
    console.error("Error getting reservation:", error);
    throw new Error("Reservation not found");
  }

  // Si ya tiene token, generar QR con ese token
  if (data.checkin_token) {
    const qrDataUrl = await generateCheckinQRCode(data.checkin_token);
    return { token: data.checkin_token, qrDataUrl };
  }

  // Si no tiene, crear uno nuevo
  return assignCheckinToken(reservationId);
}

/**
 * Valida un token de check-in y marca la reserva como "seated"
 * Devuelve los datos de la reserva si es válido
 */
export async function validateCheckinToken(token: string): Promise<{
  success: boolean;
  reservation?: Reservation;
  error?: string;
}> {
  const supabase = await supabaseServer();

  // Buscar reserva con este token
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      *,
      restaurant_info:restaurant_id (
        id,
        name,
        slug
      )
    `)
    .eq("checkin_token", token)
    .single();

  if (error || !data) {
    return { success: false, error: "Token inválido o reserva no encontrada" };
  }

  const reservation = data as Reservation;

  // Verificar que la reserva está en un estado válido para check-in
  if (reservation.status === "cancelled") {
    return { success: false, error: "Esta reserva ha sido cancelada" };
  }

  if (reservation.status === "seated") {
    return { success: false, error: "El cliente ya ha hecho check-in", reservation };
  }

  if (reservation.status === "finished") {
    return { success: false, error: "Esta reserva ya ha finalizado" };
  }

  if (reservation.status === "no_show") {
    return { success: false, error: "Esta reserva está marcada como no-show" };
  }

  // Verificar que la reserva es para hoy (con margen de 2 horas antes/después)
  const reservationTime = new Date(reservation.datetime_utc);
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  if (reservationTime.getTime() > now.getTime() + twoHoursMs) {
    return {
      success: false,
      error: "La reserva es para más tarde. Check-in disponible 2 horas antes.",
      reservation
    };
  }

  // Actualizar estado a "seated"
  const { error: updateError } = await supabase
    .from("reservations")
    .update({ status: "seated" })
    .eq("id", reservation.id);

  if (updateError) {
    console.error("Error updating reservation status:", updateError);
    return { success: false, error: "Error al actualizar el estado" };
  }

  // Devolver reserva actualizada
  return {
    success: true,
    reservation: { ...reservation, status: "seated" }
  };
}

/* ------------------------------------------------------------------
 * WHATSAPP CONFIRMATION WITH QR
 * ------------------------------------------------------------------*/

const SERVANA_AI_URL = process.env.SERVANA_AI_URL || "https://servana-ia-production-e083.up.railway.app";
const SERVANA_AI_SECRET = process.env.SERVANA_AI_SECRET || "";

/**
 * Envía confirmación de reserva por WhatsApp con QR de check-in
 */
export async function sendReservationConfirmationWithQR(params: {
  reservationId: string;
  phone: string;
  name: string;
  partySize: number;
  datetimeUtc: string;
  tz: string;
  checkinToken: string;
  restaurantId: string;
  locator?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    phone,
    name,
    partySize,
    datetimeUtc,
    tz,
    checkinToken,
    restaurantId,
    locator,
  } = params;

  // Obtener nombre del restaurante
  const supabase = await supabaseServer();
  const { data: restaurant } = await supabase
    .from("restaurant_info")
    .select("name")
    .eq("id", restaurantId)
    .single();

  const restaurantName = restaurant?.name || "El Restaurante";

  try {
    const response = await fetch(`${SERVANA_AI_URL}/api/send-confirmation-with-qr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVANA_AI_SECRET}`,
      },
      body: JSON.stringify({
        phone,
        name,
        partySize,
        datetimeUtc,
        tz,
        checkinToken,
        restaurantName,
        locator,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[sendReservationConfirmationWithQR] Error:", response.status, errorData);
      return { success: false, error: errorData.error || "Failed to send confirmation" };
    }

    const result = await response.json();
    console.log("[sendReservationConfirmationWithQR] Success:", result);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[sendReservationConfirmationWithQR] Exception:", errorMessage);
    return { success: false, error: errorMessage };
  }
}