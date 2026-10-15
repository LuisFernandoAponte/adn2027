import React, { memo } from "react";
import {
  Car, Clock, User, DollarSign, Wrench, Shield, CheckCircle2, ChevronRight
} from "lucide-react";
import { CardDS } from "@/components/ui/DesignSystem";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import {
  type EstadoTrabajoType,
  getCodigoOT,
  formatRangoHoras,
  currencyFormatter,
  ETIQUETAS_ACCION_ESTADO,
  SIGUIENTE_ESTADO_MAP,
} from "./stateMachine";
import type { Trabajo } from "@/api/citaApi";

interface TrabajoCardProps {
  trabajo: Trabajo;
  onCambiarEstado: (trabajo: Trabajo, nuevoEstado: EstadoTrabajoType) => void;
  onOpenDetail: (trabajo: Trabajo) => void;
  isCambiando?: boolean;
}

const getBadgeVariant = (estado?: string): "blue" | "amber" | "purple" | "emerald" | "red" | "neutral" => {
  switch (estado) {
    case "Agendado":
      return "blue";
    case "En taller":
      return "purple";
    case "En progreso":
      return "amber";
    case "En revisión":
      return "amber";
    case "Completado":
      return "emerald";
    case "Entregado":
      return "emerald";
    case "Cancelado":
      return "red";
    default:
      return "neutral";
  }
};

export const TrabajoCard: React.FC<TrabajoCardProps> = memo(({
  trabajo,
  onCambiarEstado,
  onOpenDetail,
  isCambiando = false,
}) => {
  const codigoOT = getCodigoOT(trabajo.id);
  const clienteNombre = trabajo.cliente?.usuario?.nombreCompleto || trabajo.cliente?.nombre || "Cliente Sin Nombre";
  const estadoActual = (trabajo.estado || "Agendado") as EstadoTrabajoType;
  const siguienteEstado = SIGUIENTE_ESTADO_MAP[estadoActual];
  const botonTexto = ETIQUETAS_ACCION_ESTADO[estadoActual];

  const serviciosList = trabajo.detalleServicios || [];
  const repuestosList = trabajo.citasRepuestos || [];
  
  // Cálculo de costo total
  const costoServicios = serviciosList.reduce((acc, s) => acc + Number(s.servicio?.costo || 0), 0);
  const costoRepuestos = repuestosList.reduce(
    (acc, r) => acc + Number(r.precioUnitario || 0) * (r.cantidad || 1),
    0
  );
  const totalCosto = costoServicios + costoRepuestos;

  const rangoHorasFormatted = formatRangoHoras(
    trabajo.horaInicio ? String(trabajo.horaInicio) : null,
    trabajo.horaFin ? String(trabajo.horaFin) : null
  );

  return (
    <CardDS className="group flex flex-col justify-between space-y-4 hover:border-red-900/40 border border-white/5 transition-all duration-200">
      {/* Header Card: OT Code + Status Badge */}
      <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black font-mono tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg">
              {codigoOT}
            </span>
            <span className="text-xs text-neutral-400 font-medium">#{String(trabajo.id).substring(0, 6)}</span>
          </div>
          <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
            <span>{clienteNombre}</span>
          </h3>
        </div>
        <BadgeDS variant={getBadgeVariant(estadoActual)}>
          {estadoActual}
        </BadgeDS>
      </div>

      {/* Auto Info + Placa Chip */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-neutral-300 font-semibold">
            <Car className="h-4 w-4 text-red-400" />
            <span>Vehículo Registrado</span>
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider bg-neutral-950 px-2.5 py-1 rounded-md border border-white/10 text-neutral-200">
            {trabajo.observaciones?.includes("Auto:")
              ? trabajo.observaciones.split("Auto:")[1]?.split(".")[0]?.trim()
              : "AUTO-ADN"}
          </span>
        </div>

        {/* Formatted Hours without Epoch Bug */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-neutral-500" />
            <span>{rangoHorasFormatted}</span>
          </span>
          <span className="font-mono font-bold text-neutral-100">
            {currencyFormatter.format(totalCosto > 0 ? totalCosto : 150)}
          </span>
        </div>

        {/* Services List as Chips */}
        {serviciosList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {serviciosList.slice(0, 3).map((ds, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium bg-neutral-950 border border-white/5 px-2 py-0.5 rounded-md text-neutral-300"
              >
                🛠️ {ds.servicio?.descripcion || "Mantenimiento General"}
              </span>
            ))}
            {serviciosList.length > 3 && (
              <span className="text-[10px] font-medium bg-neutral-950 text-neutral-500 px-1.5 py-0.5 rounded-md">
                +{serviciosList.length - 3} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(trabajo)}
          className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded px-2 py-1"
        >
          Detalles OT <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {siguienteEstado && botonTexto ? (
          <ButtonDS
            variant={estadoActual === "En revisión" ? "outline-red" : "primary"}
            isLoading={isCambiando}
            onClick={() => onCambiarEstado(trabajo, siguienteEstado)}
            className="text-xs py-2 px-3"
          >
            {botonTexto}
          </ButtonDS>
        ) : (
          <BadgeDS variant="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Finalizado
          </BadgeDS>
        )}
      </div>
    </CardDS>
  );
});

TrabajoCard.displayName = "TrabajoCard";
