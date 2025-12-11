import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Normaliza un número de teléfono para búsqueda consistente
 */
function normalizePhone(phone: string): string {
  if (!phone) return "";

  // Eliminar prefijo whatsapp: si existe
  let normalized = phone.replace(/^whatsapp:/i, "");

  // Eliminar todos los caracteres no numéricos excepto +
  normalized = normalized.replace(/[^\d+]/g, "");

  // Asegurar que empiece con +
  if (!normalized.startsWith("+") && normalized.length > 0) {
    normalized = "+" + normalized;
  }

  return normalized;
}

/**
 * GET /api/customers/lookup?phone=xxx&restaurantId=xxx
 * Busca un cliente por teléfono para un restaurante específico
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const restaurantId = searchParams.get("restaurantId");

    if (!phone || !restaurantId) {
      return NextResponse.json(
        { error: "Missing phone or restaurantId parameter" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || normalizedPhone.length < 8) {
      return NextResponse.json(
        { found: false, customer: null },
        { status: 200 }
      );
    }

    const supabase = await supabaseServer();

    // Buscar cliente por teléfono
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, name, phone, total_reservations, total_no_shows, total_cancellations, last_visit_at, notes, preferred_language")
      .eq("restaurant_id", restaurantId)
      .eq("phone", normalizedPhone)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No encontrado
        return NextResponse.json({ found: false, customer: null });
      }
      console.error("[Customer Lookup] Error:", error.message);
      return NextResponse.json(
        { error: "Error searching customer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalReservations: customer.total_reservations,
        totalNoShows: customer.total_no_shows,
        totalCancellations: customer.total_cancellations,
        lastVisitAt: customer.last_visit_at,
        notes: customer.notes,
        preferredLanguage: customer.preferred_language,
      },
    });
  } catch (error) {
    console.error("[Customer Lookup] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
