import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SERVANA_API_URL || "https://servana-ia-production-e083.up.railway.app";

/**
 * POST /api/import-menu-url
 * Proxy para importar menú desde URL
 * Evita problemas de CORS al hacer la petición desde el servidor
 *
 * Body fields:
 * - url: string (required)
 * - includePrices: boolean (optional, default false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, includePrices } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "No se ha proporcionado una URL válida" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE}/api/onboarding/process-menu-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, includePrices: includePrices === true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Error procesando la URL" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en /api/import-menu-url:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
