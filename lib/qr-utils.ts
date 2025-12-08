import { randomBytes } from "crypto";
import QRCode from "qrcode";

/**
 * Genera un token único para check-in (16 bytes = 32 caracteres hex)
 */
export function generateCheckinToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Genera un QR code como Data URL (base64) para una reserva
 */
export async function generateCheckinQRCode(token: string): Promise<string> {
  // El QR contiene el token directamente (simple y seguro)
  const qrData = `checkin:${token}`;

  const qrDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return qrDataUrl;
}
