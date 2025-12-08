/**
 * Script de prueba para generar un QR de check-in
 * Uso: npx tsx scripts/test-qr.ts <reservation_id>
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateCheckinToken, generateCheckinQRCode } from "../lib/qr-utils";
import * as fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const reservationId = process.argv[2];

  if (!reservationId) {
    // Si no se pasa ID, buscar la reserva más reciente confirmada
    console.log("No se pasó ID. Buscando reserva reciente...\n");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let reservation;

  if (reservationId) {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, name, phone, datetime_utc, party_size, status, checkin_token")
      .eq("id", reservationId)
      .single();

    if (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    reservation = data;
  } else {
    // Buscar la reserva más reciente con status confirmed
    const { data, error } = await supabase
      .from("reservations")
      .select("id, name, phone, datetime_utc, party_size, status, checkin_token")
      .eq("status", "confirmed")
      .order("datetime_utc", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("No se encontró ninguna reserva confirmada:", error.message);
      process.exit(1);
    }
    reservation = data;
  }

  console.log("Reserva encontrada:");
  console.log(`  ID: ${reservation.id}`);
  console.log(`  Nombre: ${reservation.name}`);
  console.log(`  Teléfono: ${reservation.phone}`);
  console.log(`  Fecha: ${new Date(reservation.datetime_utc).toLocaleString("es-ES", { timeZone: "Europe/Zurich" })}`);
  console.log(`  Personas: ${reservation.party_size}`);
  console.log(`  Estado: ${reservation.status}`);
  console.log(`  Token actual: ${reservation.checkin_token || "(ninguno)"}`);
  console.log("");

  // Generar o reutilizar token
  let token = reservation.checkin_token;

  if (!token) {
    token = generateCheckinToken();
    console.log(`Generando nuevo token: ${token}`);

    // Guardar en BD
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ checkin_token: token })
      .eq("id", reservation.id);

    if (updateError) {
      console.error("Error guardando token:", updateError.message);
      process.exit(1);
    }
    console.log("Token guardado en BD");
  } else {
    console.log(`Usando token existente: ${token}`);
  }

  // Generar QR
  const qrDataUrl = await generateCheckinQRCode(token);

  // Guardar como archivo HTML para visualizar
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>QR Check-in - ${reservation.name}</title>
  <style>
    body { font-family: system-ui; max-width: 400px; margin: 40px auto; text-align: center; }
    img { width: 300px; height: 300px; }
    .info { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 12px; }
    h1 { font-size: 1.5em; }
  </style>
</head>
<body>
  <h1>QR de Check-in</h1>
  <img src="${qrDataUrl}" alt="QR Code" />
  <div class="info">
    <p><strong>${reservation.name}</strong></p>
    <p>${reservation.party_size} personas</p>
    <p>${new Date(reservation.datetime_utc).toLocaleString("es-ES", { timeZone: "Europe/Zurich" })}</p>
  </div>
  <p style="color: #666; font-size: 0.8em;">Token: ${token}</p>
</body>
</html>
`;

  const outputPath = "/tmp/qr-checkin-test.html";
  fs.writeFileSync(outputPath, htmlContent);

  console.log(`\nQR generado! Abre el archivo:`);
  console.log(`  open ${outputPath}`);
  console.log(`\nO copia este Data URL:`);
  console.log(qrDataUrl.substring(0, 100) + "...");
}

main();
