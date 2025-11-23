import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SERVANA_API_URL || "https://servana-ia-production-e083.up.railway.app";

/**
 * POST /api/import-menu
 * Proxy para importar menú desde archivo (PDF, JPG, PNG)
 * Evita problemas de CORS al hacer la petición desde el servidor
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("menu") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se ha proporcionado ningún archivo" },
        { status: 400 }
      );
    }

    // Crear FormData para enviar al backend
    const backendFormData = new FormData();
    backendFormData.append("menu", file);

    const response = await fetch(`${API_BASE}/api/onboarding/process-menu`, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Error procesando el archivo" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en /api/import-menu:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
