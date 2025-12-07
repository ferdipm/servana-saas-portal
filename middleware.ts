import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Detectar dispositivos móviles por User-Agent (excluye iPad/tablets)
function isMobileDevice(userAgent: string): boolean {
  // Excluir iPads explícitamente (tienen "iPad" en el UA)
  if (/iPad/i.test(userAgent)) {
    return false;
  }
  // Solo móviles: iPhone, Android phones, etc.
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  return mobileRegex.test(userAgent);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  // No redirigir si:
  // - Ya está en /m (versión móvil)
  // - Es una ruta de API
  // - Es una ruta de login
  // - Es un asset estático
  // - Tiene cookie de preferencia desktop
  if (
    pathname.startsWith("/m") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Verificar si el usuario prefiere la versión desktop
  const preferDesktop = request.cookies.get("prefer-desktop")?.value === "true";
  if (preferDesktop) {
    return NextResponse.next();
  }

  // Si es móvil y está en la raíz o /pending, redirigir a /m
  if (isMobileDevice(userAgent)) {
    const mobileUrl = request.nextUrl.clone();

    if (pathname === "/") {
      mobileUrl.pathname = "/m";
      return NextResponse.redirect(mobileUrl);
    }

    if (pathname === "/pending") {
      mobileUrl.pathname = "/m/reservas/pending";
      return NextResponse.redirect(mobileUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir archivos estáticos y API
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
