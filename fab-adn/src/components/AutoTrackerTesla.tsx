import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Clock, Wrench, CheckCircle2, Shield, AlertCircle, Phone, RefreshCw,
  FileText, Package, ChevronDown, ChevronUp, User, Sparkles, Activity, Gauge
} from "lucide-react";
import type { Trabajo } from "@/api/citaApi";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { getCodigoOT, currencyFormatter, formatRangoHoras } from "@/features/empleado/stateMachine";
import { openWhatsApp } from "@/lib/whatsapp";

interface AutoTrackerTeslaProps {
  trabajo: Trabajo;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

const ETAPAS_TRACKER = [
  {
    key: "Agendado",
    titulo: "Iniciado / Cita",
    subtitulo: "Confirmado en sistema",
    icon: CalendarIcon,
    porcentaje: 15,
  },
  {
    key: "En taller",
    titulo: "Ingreso a Taller",
    subtitulo: "Inspección pericial",
    icon: WorkshopIcon,
    porcentaje: 35,
  },
  {
    key: "En progreso",
    titulo: "En Progreso",
    subtitulo: "Trabajo en bahía",
    icon: WrenchIcon,
    porcentaje: 60,
  },
  {
    key: "En revisión",
    titulo: "En Revisión",
    subtitulo: "Control de calidad",
    icon: SearchIcon,
    porcentaje: 85,
  },
  {
    key: "Completado",
    titulo: "Listo",
    subtitulo: "Listo para entrega",
    icon: CheckIcon,
    porcentaje: 95,
  },
  {
    key: "Entregado",
    titulo: "Entregado",
    subtitulo: "En manos del cliente",
    icon: FlagIcon,
    porcentaje: 100,
  },
];

function CalendarIcon(props: any) {
  return <Clock className="h-4 w-4" {...props} />;
}
function WorkshopIcon(props: any) {
  return <Car className="h-4 w-4" {...props} />;
}
function WrenchIcon(props: any) {
  return <Wrench className="h-4 w-4" {...props} />;
}
function SearchIcon(props: any) {
  return <Activity className="h-4 w-4" {...props} />;
}
function CheckIcon(props: any) {
  return <CheckCircle2 className="h-4 w-4" {...props} />;
}
function FlagIcon(props: any) {
  return <Sparkles className="h-4 w-4" {...props} />;
}

export const AutoTrackerTesla: React.FC<AutoTrackerTeslaProps> = ({
  trabajo,
  onRefresh,
  isRefreshing = false,
  className = "",
}) => {
  const [detallesExpandidos, setDetallesExpandidos] = useState(false);
  const estadoActual = trabajo.estado || "Agendado";
  const codigoOT = getCodigoOT(trabajo.id);

  // Calcular índice de etapa actual
  const indexActual = ETAPAS_TRACKER.findIndex((e) => e.key === estadoActual);
  const pasoValido = indexActual >= 0 ? indexActual : 0;
  const porcentajeAvance = ETAPAS_TRACKER[pasoValido]?.porcentaje || 15;

  const isCancelado = estadoActual === "Cancelado";
  const isFinalizado = estadoActual === "Completado" || estadoActual === "Entregado";

  // Identificación del vehículo
  const marcaModelo = trabajo.vehiculo_marca && trabajo.vehiculo_modelo
    ? `${trabajo.vehiculo_marca} ${trabajo.vehiculo_modelo}`
    : (trabajo.vehiculo?.split("- Placa:")[0]?.trim() || "Vehículo en Taller");

  const anio = trabajo.vehiculo_anio || "";
  const placa = trabajo.placa || (trabajo.vehiculo?.includes("Placa:") ? trabajo.vehiculo.split("Placa:")[1]?.trim() : "4829-KLS");
  const odometro = trabajo.kilometraje ? `${Number(trabajo.kilometraje).toLocaleString()} KM` : "35,000 KM";

  const mecanicoNombre = trabajo.mecanico || "Especialista ADN Motors";
  const mecanicoCargo = trabajo.mecanico_cargo || "Mecánico Certificado";

  // Servicios y Repuestos
  const servicios = (trabajo.servicios_detalle && trabajo.servicios_detalle.length > 0)
    ? trabajo.servicios_detalle
    : (trabajo.servicios ? [{ id: "1", descripcion: trabajo.servicios, costo: trabajo.costo_servicios || 0 }] : []);

  const repuestos = trabajo.repuestos || trabajo.citasRepuestos || [];

  const handleContactarMecanico = () => {
    const mensaje = `Hola ADN Motors, deseo consultar sobre el estado de mi auto ${marcaModelo} (Placa ${placa}) bajo la orden ${codigoOT}. Estado actual: ${estadoActual}.`;
    openWhatsApp({
      phoneNumber: trabajo.mecanico_telefono || "59170000000",
      message: mensaje,
    });
  };

  return (
    <div className={`rounded-3xl bg-neutral-900/90 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl relative ${className}`}>
      {/* Glow de fondo Tesla Style */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

      {/* ── BARRA SUPERIOR TELEMETRÍA & LIVE STATUS ── */}
      <div className="p-5 sm:p-6 border-b border-white/5 bg-neutral-950/60 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isFinalizado ? "bg-emerald-400" : isCancelado ? "bg-red-400" : "bg-amber-400"
                }`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isFinalizado ? "bg-emerald-500" : isCancelado ? "bg-red-500" : "bg-amber-500"
                }`} />
              </span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                Telemetría en Vivo • ADN Motors Tracker
              </span>
              <span className="font-mono text-xs font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                {codigoOT}
              </span>
              <span className="text-xs font-bold text-neutral-400">
                {`Cita #${String(trabajo.id)}`}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Car className="h-6 w-6 text-red-500 flex-shrink-0" />
              <span>{marcaModelo}</span>
              {anio && <span className="text-sm font-medium text-neutral-400">({anio})</span>}
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Estado Actual</p>
              <p className={`text-sm font-black ${
                isFinalizado ? "text-emerald-400" : isCancelado ? "text-red-400" : "text-amber-400"
              }`}>
                {estadoActual}
              </p>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white transition-all disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-red-500" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* ── METRICAS CLAVE / TELEMETRIA RÁPIDA ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/5">
          {/* Placa Metálica Estilo Boliviano */}
          <div className="rounded-xl bg-neutral-900/90 border border-white/5 p-2.5 flex items-center gap-2.5">
            <div className="px-2 py-1 rounded bg-neutral-950 border border-white/20 font-mono text-xs font-black text-neutral-100 tracking-wider">
              {placa}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">Placa</p>
              <p className="text-xs text-neutral-200 font-medium truncate">Bolivia</p>
            </div>
          </div>

          {/* Odómetro Entrada */}
          <div className="rounded-xl bg-neutral-900/90 border border-white/5 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">Odómetro</p>
              <p className="font-mono text-xs font-bold text-neutral-100">{odometro}</p>
            </div>
          </div>

          {/* Mecánico Asignado */}
          <div className="rounded-xl bg-neutral-900/90 border border-white/5 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">Responsable</p>
              <p className="text-xs font-bold text-neutral-100 truncate">{mecanicoNombre}</p>
            </div>
          </div>

          {/* Avance del Trabajo */}
          <div className="rounded-xl bg-neutral-900/90 border border-white/5 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">Avance Taller</p>
              <p className="font-mono text-xs font-black text-emerald-400">{porcentajeAvance}% Completado</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA DE PROGRESO TESLA Y STEPPER INTERACTIVO ── */}
      <div className="p-5 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-neutral-300 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-red-500" />
              <span>Línea de Trazabilidad en Tiempo Real</span>
            </span>
            <span className="font-mono font-bold text-neutral-400">
              Fase {pasoValido + 1} de {ETAPAS_TRACKER.length}
            </span>
          </div>

          {/* Barra de Progreso Continua con Gradiente */}
          <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-white/5 p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${porcentajeAvance}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isFinalizado
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  : isCancelado
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              }`}
            />
          </div>
        </div>

        {/* ── PASOS INTERACTIVOS (GRID 6 HITOS) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {ETAPAS_TRACKER.map((etapa, idx) => {
            const isCompletado = idx < pasoValido;
            const isActual = idx === pasoValido;
            const isPendiente = idx > pasoValido;
            const Icon = etapa.icon;

            // Buscar fecha real en historial_estados si existe
            const eventoHistorial = (trabajo.historial_estados || []).find(
              (h) => h.estado === etapa.key
            );
            const fechaStr = eventoHistorial?.fecha_cambio || eventoHistorial?.fechaCambio;
            const horaFormato = fechaStr
              ? new Date(fechaStr).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })
              : null;

            return (
              <div
                key={etapa.key}
                className={`rounded-2xl p-3 border transition-all duration-200 relative flex flex-col justify-between ${
                  isActual
                    ? "bg-gradient-to-b from-neutral-800 to-neutral-900 border-red-500/50 shadow-lg shadow-red-500/10 ring-1 ring-red-500/40"
                    : isCompletado
                    ? "bg-neutral-950/70 border-emerald-500/30 text-neutral-300"
                    : "bg-neutral-950/40 border-white/5 text-neutral-500 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                      isActual
                        ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                        : isCompletado
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-neutral-900 text-neutral-500 border border-white/5"
                    }`}
                  >
                    {isCompletado ? "✓" : <Icon className="h-3.5 w-3.5" />}
                  </div>

                  {horaFormato && (
                    <span className="font-mono text-[9px] font-bold text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded">
                      {horaFormato}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className={`text-xs font-bold leading-tight ${isActual ? "text-white" : isCompletado ? "text-neutral-200" : "text-neutral-500"}`}>
                    {etapa.titulo}
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{etapa.subtitulo}</p>
                </div>

                {isActual && (
                  <div className="mt-2 pt-1 border-t border-white/10 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-red-400">
                      En Curso
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── DIAGNÓSTICO TÉCNICO & HALLAZGOS ── */}
        <div className="rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-950 to-neutral-900 border border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Informe de Diagnóstico Técnico
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              Mecánico: <span className="text-neutral-200 font-semibold">{mecanicoNombre}</span> ({mecanicoCargo})
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/60 p-3 rounded-xl border border-white/5">
            {trabajo.diagnostico || "Vehículo en evaluación por el equipo de ingeniería mecánica de ADN Motors. Escaneo por computadora y comprobación de fluidos en proceso."}
          </p>

          {trabajo.observaciones && trabajo.observaciones !== "Sin observaciones." && (
            <p className="text-[11px] text-neutral-400 italic px-1">
              Nota adicional: {trabajo.observaciones}
            </p>
          )}
        </div>

        {/* ── BOTONES DE ACCIÓN RÁPIDA VIP ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setDetallesExpandidos(!detallesExpandidos)}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors py-2 px-3 rounded-xl hover:bg-white/5"
          >
            <span>{detallesExpandidos ? "Ocultar Servicios & Repuestos" : "Ver Servicios, Repuestos & Costos"}</span>
            {detallesExpandidos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ButtonDS
              variant="secondary"
              icon={<Phone className="h-4 w-4 text-emerald-400" />}
              onClick={handleContactarMecanico}
              className="text-xs py-2 px-3.5 flex-1 sm:flex-initial"
            >
              Consultar por WhatsApp
            </ButtonDS>
          </div>
        </div>

        {/* ── DETALLES EXPANDIDOS (SERVICIOS + REPUESTOS + HISTORIAL) ── */}
        <AnimatePresence>
          {detallesExpandidos && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-3 border-t border-white/5 overflow-hidden"
            >
              {/* Desglose de Servicios y Repuestos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Servicios */}
                <div className="rounded-2xl bg-neutral-950 p-4 border border-white/5 space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-red-400" />
                    Servicios Asignados ({servicios.length})
                  </h5>
                  <div className="space-y-1.5">
                    {servicios.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-neutral-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          {s.descripcion}
                        </span>
                        <span className="font-mono text-neutral-400">
                          {currencyFormatter.format(s.costo)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Repuestos */}
                <div className="rounded-2xl bg-neutral-950 p-4 border border-white/5 space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-amber-400" />
                    Repuestos e Insumos ({repuestos.length})
                  </h5>
                  {repuestos.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-2">
                      Sin repuestos adicionales cargados a la orden.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {repuestos.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                          <div>
                            <p className="text-neutral-300 font-medium">{r.nombre}</p>
                            <p className="text-[10px] text-neutral-500 font-mono">Cant: {r.cantidad} u</p>
                          </div>
                          <span className="font-mono text-amber-400">
                            {currencyFormatter.format(Number(r.subtotal || r.precio_unitario * r.cantidad || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total Final */}
              <div className="rounded-2xl bg-neutral-950 border border-white/10 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 font-semibold uppercase">Total Liquidación de Orden</p>
                  <p className="text-[11px] text-neutral-500">Mano de obra especializada + repuestos genuinos</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-black text-emerald-400">
                    {currencyFormatter.format(trabajo.costo_total || 150)}
                  </span>
                </div>
              </div>

              {/* Historial de Auditoría en Vivo */}
              {trabajo.historial_estados && trabajo.historial_estados.length > 0 && (
                <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-purple-400" />
                    Bitácora de Estados Registrada en Taller ({trabajo.historial_estados.length} eventos)
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {trabajo.historial_estados.map((h, i) => {
                      const fecha = h.fecha_cambio || h.fechaCambio;
                      const formattedDate = fecha ? new Date(fecha).toLocaleString("es-BO") : "Registrado";
                      return (
                        <div key={h.id || i} className="text-xs flex items-start gap-2.5 py-1 border-b border-white/5 last:border-0">
                          <span className="h-2 w-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-200">
                                {h.estado_anterior ? `${h.estado_anterior} ➔ ${h.estado}` : `Fase: ${h.estado}`}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">{formattedDate}</span>
                            </div>
                            {h.observaciones && (
                              <p className="text-[11px] text-neutral-400 mt-0.5">{h.observaciones}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
