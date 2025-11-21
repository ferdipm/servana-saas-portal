"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

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

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({
      name: name.trim(),
      phone: sanitizedPhone,
      website: sanitizedWebsite,
      address: sanitizedAddress,
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
  };

  // Solo actualizar special_days si el campo existe en la tabla
  if (parsedSpecialDays.length > 0) {
    updateData.special_days = parsedSpecialDays;
  }

  const { error } = await supabase
    .from("restaurant_info")
    .update(updateData)
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateOpeningHours:", error);
    throw new Error("No se han podido actualizar los horarios.");
  }

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}

/**
 * Actualiza el menú de un restaurante (menu_items)
 */
export async function updateMenu(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
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

  // Volvemos a validar la página de ajustes
  revalidatePath("/settings");
}