"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

// URL del backend para RAG
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://servana-ia-production-e083.up.railway.app';

/**
 * Función auxiliar para re-indexar contenido en RAG
 * Se llama en background después de guardar cambios
 */
async function triggerRagReindex(
  restaurantId: string,
  tenantId: string,
  kind: 'menu_item' | 'faq' | 'wine' | 'set_menu' | 'opening_hours',
  data: any
): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rag/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId, tenantId, kind, data }),
    });

    if (!response.ok) {
      console.warn('[RAG] Reindex warning:', await response.text());
    } else {
      const result = await response.json();
      console.log(`[RAG] Reindexed ${result.indexed} ${kind} chunks`);
    }
  } catch (error) {
    // No bloquear la operación principal si RAG falla
    console.warn('[RAG] Reindex failed (non-blocking):', error);
  }
}

/**
 * Actualiza los datos generales de un restaurante:
 * - name
 * - phone
 * - website
 * - address
 */
export async function updateGeneralSettings(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const name = formData.get("name");
  const phone = formData.get("phone");
  const website = formData.get("website");
  const address = formData.get("address");
  const totalCapacity = formData.get("totalCapacity");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("El nombre del restaurante es obligatorio.");
  }

  const sanitizedPhone =
    typeof phone === "string" && phone.trim().length > 0
      ? phone.trim()
      : null;

  const sanitizedWebsite =
    typeof website === "string" && website.trim().length > 0
      ? website.trim()
      : null;

  const sanitizedAddress =
    typeof address === "string" && address.trim().length > 0
      ? address.trim()
      : null;

  // Validar y parsear aforo total (mínimo 1, máximo 999, default 50)
  let parsedCapacity = 50;
  if (totalCapacity && typeof totalCapacity === "string") {
    const num = parseInt(totalCapacity, 10);
    if (!isNaN(num) && num >= 1 && num <= 999) {
      parsedCapacity = num;
    }
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      name: name.trim(),
      phone: sanitizedPhone,
      website: sanitizedWebsite,
      address: sanitizedAddress,
      total_capacity: parsedCapacity,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateGeneralSettings:", error);
    throw new Error("No se han podido guardar los datos generales.");
  }

  // Volvemos a validar la página de ajustes para este restaurante
  revalidatePath("/settings");
}

/**
 * Actualiza el logo de un restaurante (logo_url)
 */
export async function updateRestaurantLogo(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const logoUrl = formData.get("logoUrl");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  // logoUrl puede ser vacío (para eliminar el logo)
  const sanitizedLogoUrl =
    typeof logoUrl === "string" && logoUrl.trim().length > 0
      ? logoUrl.trim()
      : null;

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      logo_url: sanitizedLogoUrl,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateRestaurantLogo:", error);
    throw new Error("No se ha podido actualizar el logo.");
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza los horarios de apertura de un restaurante (opening_hours y special_days)
 */
export async function updateOpeningHours(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const tenantId = formData.get("tenantId");
  const openingHours = formData.get("openingHours");
  const specialDays = formData.get("specialDays");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!openingHours || typeof openingHours !== "string") {
    throw new Error("Faltan los horarios de apertura.");
  }

  // Parsear y validar el JSON de horarios
  let parsedHours;
  try {
    parsedHours = JSON.parse(openingHours);
  } catch (err) {
    throw new Error("Formato de horarios inválido.");
  }

  // Parsear días especiales si existen
  let parsedSpecialDays = [];
  if (specialDays && typeof specialDays === "string") {
    try {
      parsedSpecialDays = JSON.parse(specialDays);
    } catch (err) {
      console.warn("Error parsing special days:", err);
    }
  }

  const supabase = await supabaseServer();

  const updateData: any = {
    opening_hours: parsedHours,
    special_days: parsedSpecialDays, // Siempre actualizar, aunque esté vacío
  };

  const { error } = await supabase
    .from("restaurant_info")
    .update(updateData)
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateOpeningHours:", error);
    throw new Error("No se han podido actualizar los horarios.");
  }

  // Re-indexar en RAG (background, no bloquea)
  if (tenantId && typeof tenantId === "string") {
    triggerRagReindex(restaurantId, tenantId, 'opening_hours', {
      openingHours: parsedHours,
      specialDays: parsedSpecialDays,
    });
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza el menú de un restaurante (menu_items)
 */
export async function updateMenu(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const tenantId = formData.get("tenantId");
  const menu = formData.get("menu");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!menu || typeof menu !== "string") {
    throw new Error("Faltan los datos del menú.");
  }

  // Parsear y validar el JSON del menú
  let parsedMenu;
  try {
    parsedMenu = JSON.parse(menu);
  } catch (err) {
    throw new Error("Formato de menú inválido.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      menu_items: parsedMenu,
      menu_last_updated: new Date().toISOString(),
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateMenu:", error);
    throw new Error("No se ha podido actualizar el menú.");
  }

  // Re-indexar en RAG (background, no bloquea)
  if (tenantId && typeof tenantId === "string") {
    triggerRagReindex(restaurantId, tenantId, 'menu_item', parsedMenu);
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza los menús cerrados de un restaurante (set_menus)
 */
export async function updateSetMenus(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const tenantId = formData.get("tenantId");
  const setMenus = formData.get("setMenus");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!setMenus || typeof setMenus !== "string") {
    throw new Error("Faltan los datos de los menús.");
  }

  // Parsear y validar el JSON de menús
  let parsedSetMenus;
  try {
    parsedSetMenus = JSON.parse(setMenus);
  } catch (err) {
    throw new Error("Formato de menús inválido.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      set_menus: parsedSetMenus,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateSetMenus:", error);
    throw new Error("No se han podido actualizar los menús.");
  }

  // Re-indexar en RAG (background, no bloquea)
  if (tenantId && typeof tenantId === "string") {
    triggerRagReindex(restaurantId, tenantId, 'set_menu', parsedSetMenus);
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza la carta de vinos de un restaurante (wine_menu)
 */
export async function updateWineMenu(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const tenantId = formData.get("tenantId");
  const wineMenu = formData.get("wineMenu");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!wineMenu || typeof wineMenu !== "string") {
    throw new Error("Faltan los datos de la carta de vinos.");
  }

  // Parsear y validar el JSON de la carta de vinos
  let parsedWineMenu;
  try {
    parsedWineMenu = JSON.parse(wineMenu);
  } catch (err) {
    throw new Error("Formato de carta de vinos inválido.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      wine_menu: parsedWineMenu,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateWineMenu:", error);
    throw new Error("No se ha podido actualizar la carta de vinos.");
  }

  // Re-indexar en RAG (background, no bloquea)
  if (tenantId && typeof tenantId === "string") {
    triggerRagReindex(restaurantId, tenantId, 'wine', parsedWineMenu);
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza las FAQs de un restaurante
 */
export async function updateFaqs(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const tenantId = formData.get("tenantId");
  const faqs = formData.get("faqs");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!faqs || typeof faqs !== "string") {
    throw new Error("Faltan los datos de las FAQs.");
  }

  // Parsear y validar el JSON de las FAQs
  let parsedFaqs;
  try {
    parsedFaqs = JSON.parse(faqs);
  } catch (err) {
    throw new Error("Formato de FAQs inválido.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      faq: parsedFaqs,  // Columna es "faq" (singular) en la DB
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateFaqs:", error);
    throw new Error("No se han podido actualizar las FAQs.");
  }

  // Re-indexar en RAG (background, no bloquea)
  if (tenantId && typeof tenantId === "string") {
    triggerRagReindex(restaurantId, tenantId, 'faq', parsedFaqs);
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza la configuración de notificaciones de un restaurante
 */
export async function updateNotificationSettings(
  restaurantId: string,
  settings: {
    reminder_24h_enabled: boolean;
    reminder_message_template?: string;
    confirmation_required: boolean;
    notify_on_cancellation: boolean;
    notify_on_new_reservation: boolean;
    staff_members?: Array<{
      phone: string;
      name: string;
      can_forward: boolean;
      receives_notifications: boolean;
    }>;
  }
) {
  if (!restaurantId) {
    throw new Error("Falta el identificador del restaurante.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      notification_settings: settings,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateNotificationSettings:", error);
    throw new Error("No se ha podido actualizar la configuración de notificaciones.");
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza la configuración del bot de un restaurante
 */
export async function updateBotSettings(
  restaurantId: string,
  settings: {
    reservation_mode: "auto_confirm" | "pending" | "disabled";
    disabled_message?: string;
  }
) {
  if (!restaurantId) {
    throw new Error("Falta el identificador del restaurante.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      bot_settings: settings,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateBotSettings:", error);
    throw new Error("No se ha podido actualizar la configuración del bot.");
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}