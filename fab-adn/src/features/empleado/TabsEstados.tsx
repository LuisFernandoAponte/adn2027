import React, { memo } from "react";
import type { EstadoTrabajoType } from "./stateMachine";

interface TabsEstadosProps {
  filtroActual: string;
  onSelectFiltro: (filtro: string) => void;
  contadores: Record<string, number>;
}

const TABS: Array<{ id: string; label: string }> = [
  { id: "Todos", label: "Todos" },
  { id: "Agendado", label: "Agendados" },
  { id: "En taller", label: "En Taller" },
  { id: "En progreso", label: "En Progreso" },
  { id: "En revisión", label: "En Revisión" },
  { id: "Completado", label: "Completados" },
  { id: "Entregado", label: "Entregados" },
];

export const TabsEstados: React.FC<TabsEstadosProps> = memo(({
  filtroActual,
  onSelectFiltro,
  contadores,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Filtro de estados de órdenes de trabajo"
      className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar touch-scroll"
    >
      {TABS.map((tab) => {
        const count = contadores[tab.id] || 0;
        const isSelected = filtroActual === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectFiltro(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer ${
              isSelected
                ? "bg-red-500/10 text-red-300 border border-red-500/30 shadow-sm"
                : "bg-neutral-900/60 border border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                isSelected
                  ? "bg-red-500/20 text-red-300"
                  : "bg-neutral-950 text-neutral-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
});

TabsEstados.displayName = "TabsEstados";
