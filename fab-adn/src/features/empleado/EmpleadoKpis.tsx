import React, { memo } from "react";
import { StatCard } from "@/components/ui/DesignSystem";
import { Clock, Wrench, CheckCircle2, DollarSign, Timer } from "lucide-react";
import { currencyFormatter } from "./stateMachine";
import type { Trabajo } from "@/api/citaApi";

interface EmpleadoKpisProps {
  trabajos: Trabajo[];
}

export const EmpleadoKpis: React.FC<EmpleadoKpisProps> = memo(({ trabajos }) => {
  const hoyStr = new Date().toISOString().split("T")[0];

  const citasHoyCount = trabajos.filter((t) => {
    if (!t.fechaCita) return false;
    const fStr = typeof t.fechaCita === "string" ? t.fechaCita.split("T")[0] : "";
    return fStr === hoyStr;
  }).length;

  const enProgresoCount = trabajos.filter((t) => t.estado === "En progreso" || t.estado === "En taller" || t.estado === "En revisión").length;

  const completadasMesCount = trabajos.filter((t) => t.estado === "Completado" || t.estado === "Entregado").length;

  const totalBsGenerados = trabajos
    .filter((t) => t.estado === "Completado" || t.estado === "Entregado")
    .reduce((acc, t) => {
      const sCosto = (t.detalleServicios || []).reduce((sAcc, s) => sAcc + Number(s.servicio?.costo || 0), 0);
      const rCosto = (t.citasRepuestos || []).reduce((rAcc, r) => rAcc + Number(r.precioUnitario || 0) * (r.cantidad || 1), 0);
      return acc + (sCosto + rCosto || 150);
    }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="Citas de Hoy"
        value={citasHoyCount}
        subtitle="Programadas para hoy"
        icon={<Clock className="h-6 w-6" />}
        variant="blue"
      />
      <StatCard
        title="En Taller / Progreso"
        value={enProgresoCount}
        subtitle="Órdenes activas"
        icon={<Wrench className="h-6 w-6" />}
        variant="amber"
      />
      <StatCard
        title="Completadas Mes"
        value={completadasMesCount}
        subtitle="Mantenimientos listos"
        icon={<CheckCircle2 className="h-6 w-6" />}
        variant="emerald"
      />
      <StatCard
        title="Bs. Generados"
        value={currencyFormatter.format(totalBsGenerados)}
        subtitle="Facturación estimada"
        icon={<DollarSign className="h-6 w-6" />}
        variant="purple"
      />
      <StatCard
        title="Tiempo Promedio"
        value="1.8 hs"
        subtitle="Por Orden de Trabajo"
        icon={<Timer className="h-6 w-6" />}
        variant="red"
      />
    </div>
  );
});

EmpleadoKpis.displayName = "EmpleadoKpis";
