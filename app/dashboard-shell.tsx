"use client";

import { Home, Users, BarChart3, Settings, Clock3 } from "lucide-react";


type Item = { href: string; label: string; icon: JSX.Element };

const nav: Item[] = [
  { href: "/", label: "Reservas", icon: <Home className="w-4 h-4" /> },
  { href: "/pending", label: "Pendientes", icon: <Clock3 className="w-4 h-4" /> },
  { href: "#", label: "Clientes", icon: <Users className="w-4 h-4" /> },
  { href: "#", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { href: "#", label: "Ajustes", icon: <Settings className="w-4 h-4" /> },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-[#0b0b0d] text-zinc-100">
      {/* Sidebar */}
      <aside className="h-screen w-[260px] bg-[#1c1e24] border-r border-white/5 flex flex-col">
        {/* Top logo */}
        <div className="px-5 pt-8 pb-6 border-b border-white/5">
          <div
            className="h-10 w-40 rounded-md bg-white/10"
            aria-label="Logo restaurante"
          />
          <div className="mt-2 text-[12px] text-zinc-500 truncate">
            Nombre del restaurante
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-8">
          <ul className="space-y-4">
            {nav.map((n) => (
              <li key={n.label}>
                <a
                  href={n.href}
                  className="
                    group flex items-center gap-x-5
                    rounded-md px-3 py-2.5
                    text-zinc-400
                    hover:text-zinc-100 hover:bg-white/5
                    transition-colors
                  "
                >
                  <span className="shrink-0 text-zinc-400 group-hover:text-zinc-100">
                    {n.icon}
                  </span>
                  <span className="text-[14px] leading-none">{n.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bloque inferior */}
        <div className="mt-auto p-4 text-xs text-zinc-500">
          <div className="rounded-xl p-3 bg-zinc-700/30 text-zinc-300">
            ¿App móvil? Próximamente.
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-xl bg-[#0b0b0d]/80">
          <div className="max-w-6xl mx-auto px-4 h-20 flex flex-col justify-center gap-1">
            <div className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Reservas
            </div>
            <div className="text-sm text-zinc-400">
              Vista general de las reservas activas del día
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="max-w-6xl mx-auto w-full p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
