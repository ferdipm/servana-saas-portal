import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// URL del servicio servana-ai
const SERVANA_AI_URL = process.env.SERVANA_AI_URL || "https://servana-ai.railway.app";
const SERVANA_AI_SECRET = process.env.SERVANA_AI_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Falta el ID de la reserva" },
        { status: 400 }
      );
    }

    // Obtener la reserva
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que la reserva tiene chat_id o phone (número de WhatsApp)
    // Usar chat_id si existe, sino usar phone
    const whatsappNumber = reservation.chat_id || reservation.phone;
    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "No hay número de teléfono disponible para esta reserva" },
        { status: 400 }
      );
    }

    // Verificar que la reserva está confirmada y es futura
    if (reservation.status !== "confirmed") {
      return NextResponse.json(
        { error: "Solo se pueden enviar recordatorios a reservas confirmadas" },
        { status: 400 }
      );
    }

    const reservationDate = new Date(reservation.datetime_utc);
    if (reservationDate < new Date()) {
      return NextResponse.json(
        { error: "No se pueden enviar recordatorios a reservas pasadas" },
        { status: 400 }
      );
    }

    // Llamar al endpoint de servana-ai para enviar el recordatorio
    const response = await fetch(`${SERVANA_AI_URL}/api/send-manual-reminder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVANA_AI_SECRET}`,
      },
      body: JSON.stringify({
        reservationId: reservation.id,
        chatId: whatsappNumber,
        name: reservation.name,
        partySize: reservation.party_size,
        datetimeUtc: reservation.datetime_utc,
        locator: reservation.locator,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[send-reminder] Error from servana-ai:", response.status, errorText);

      // Dar más detalle según el error
      let errorMsg = "Error al enviar el recordatorio";
      if (response.status === 401) {
        errorMsg = "Error de autenticación con el servicio de envío";
      } else if (response.status === 400) {
        errorMsg = "Datos de reserva incompletos";
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    // Actualizar la reserva con el estado de confirmación pendiente
    await supabase
      .from("reservations")
      .update({
        reminder_sent: true,
        confirmation_status: "pending",
        confirmation_sent_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    return NextResponse.json({
      success: true,
      message: "Reminder sent successfully",
    });
  } catch (error) {
    console.error("[send-reminder] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
