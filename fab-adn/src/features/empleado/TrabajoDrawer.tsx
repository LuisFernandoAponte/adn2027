import React, { useState } from "react";
import {
  X, Car, User, Clock, Phone, FileText, CheckCircle2, ShieldAlert, Wrench,
  DollarSign, AlertTriangle, Send
} from "lucide-react";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import {
  type EstadoTrabajoType,
  getCodigoOT,
  formatRangoHoras,
  currencyFormatter,
  dateFormatter,
  validarTransicionEstado,
} from "./stateMachine";
import type { Trabajo } from "@/api/citaApi";
import { guardarInformeTecnico } from "@/api/citaApi";

interface TrabajoDrawerProps {
  trabajo: Trabajo | null;
  isOpen: boolean;
  onClose: () => void;
  onCambiarEstado: (trabajo: Trabajo, nuevoEstado: EstadoTrabajoType, nota?: string) => Promise<void>;
}

export const TrabajoDrawer: React.FC<TrabajoDrawerProps> = ({
  trabajo,
  isOpen,
  onClose,
  onCambiarEstado,
}) => {
  if (!isOpen || !trabajo) return null;

  const [notaRegresion, setNotaRegresion] = useState("");
  const [showRegresionModal, setShowRegresionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Estados reactivos para Informe Técnico del Mecánico
  const [diagnostico, setDiagnostico] = useState(trabajo.diagnostico || "Revisión técnica inicial completada sin anomalías críticas.");
  const [observaciones, setObservaciones] = useState(trabajo.observaciones || "Trabajo progresando en conformidad con las especificaciones del fabricante.");
  const [kilometraje, setKilometraje] = useState<number>(trabajo.kilometraje || 35000);
  const [horasInvertidas, setHorasInvertidas] = useState<string>("2.5");
  const [isSavingInforme, setIsSavingInforme] = useState(false);
  const [informeExito, setInformeExito] = useState(false);

  const handleGuardarInformeTecnico = async () => {
    setIsSavingInforme(true);
    setInformeExito(false);
    try {
      await guardarInformeTecnico(String(trabajo.id), {
        diagnostico,
        observaciones: `${observaciones} (Horas invertidas estimadas: ${horasInvertidas}h)`,
        kilometraje: Number(kilometraje) || 0
      });
      setInformeExito(true);
      setTimeout(() => setInformeExito(false), 3500);
    } catch (err: any) {
      console.error("Error al guardar informe técnico:", err);
      setErrorLocal(err.response?.data?.error || "No se pudo guardar el informe técnico.");
    } finally {
      setIsSavingInforme(false);
    }
  };

  const codigoOT = getCodigoOT(trabajo.id);
  const clienteNombre = trabajo.cliente?.usuario?.nombreCompleto || trabajo.cliente?.nombre || "Cliente Sin Nombre";
  const clienteTel = trabajo.cliente?.usuario?.telefono || trabajo.cliente?.telefono || "70000000";
  const estadoActual = (trabajo.estado || "Agendado") as EstadoTrabajoType;

  const serviciosList = trabajo.detalleServicios || [];
  const repuestosList = trabajo.citasRepuestos || [];

  const costoServicios = serviciosList.reduce((acc, s) => acc + Number(s.servicio?.costo || 0), 0);
  const costoRepuestos = repuestosList.reduce(
    (acc, r) => acc + Number(r.precioUnitario || 0) * (r.cantidad || 1),
    0
  );
  const totalCosto = costoServicios + costoRepuestos;

  const handleEjecutarRegresion = async () => {
    const valid = validarTransicionEstado("En revisión", "En progreso", notaRegresion);
    if (!valid.esValido) {
      setErrorLocal(valid.error || "Nota requerida");
      return;
    }

    setIsSubmitting(true);
    setErrorLocal(null);
    try {
      await onCambiarEstado(trabajo, "En progreso", notaRegresion);
      setShowRegresionModal(false);
      setNotaRegresion("");
      onClose();
    } catch (e: any) {
      setErrorLocal(e.message || "Error al solicitar regresión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-neutral-900 border-l border-white/10 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-neutral-950 sticky top-0 z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg">
                {codigoOT}
              </span>
              <BadgeDS variant="neutral">{estadoActual}</BadgeDS>
            </div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2 mt-1">
              <span>{clienteNombre}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Cliente & Contacto */}
          <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <User className="h-4 w-4 text-red-400" /> Datos del Cliente & Contacto
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Teléfono / WhatsApp</span>
                <span className="font-semibold text-neutral-200">{clienteTel}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Horario Programado</span>
                <span className="font-semibold text-neutral-200">
                  {formatRangoHoras(trabajo.horaInicio ? String(trabajo.horaInicio) : null, trabajo.horaFin ? String(trabajo.horaFin) : null)}
                </span>
              </div>
            </div>
          </div>

          {/* Checklist de Servicios */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-red-400" /> Checklist de Servicios ({serviciosList.length})
              </h4>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {estadoActual === "Completado" || estadoActual === "Entregado" ? `${serviciosList.length}/${serviciosList.length}` : `1/${serviciosList.length || 1}`} completados
              </span>
            </div>

            <div className="space-y-2">
              {serviciosList.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-neutral-950 border border-white/5 p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-medium text-neutral-200">{s.servicio?.descripcion || "Mantenimiento Preventivo"}</span>
                  </div>
                  <span className="font-mono font-bold text-neutral-300">
                    {currencyFormatter.format(Number(s.servicio?.costo || 0))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Repuestos e Insumos Utilizados en Demanda */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-amber-400" /> Repuestos e Insumos Utilizados ({repuestosList.length})
            </h4>
            {repuestosList.length === 0 ? (
              <p className="text-xs text-neutral-500 bg-neutral-950 p-3 rounded-xl border border-white/5 italic">
                Sin repuestos asignados aún a esta orden de trabajo.
              </p>
            ) : (
              <div className="space-y-2">
                {repuestosList.map((r: any, idx: number) => (
                  <div key={idx} className="rounded-xl bg-neutral-950 border border-white/5 p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-neutral-200">{r.inventario?.nombre || "Repuesto Taller"}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">Código: {r.inventario?.codigo || "REP-001"} • Cant: {r.cantidad || 1} u</p>
                    </div>
                    <span className="font-mono font-bold text-amber-400">
                      {currencyFormatter.format(Number(r.precioUnitario || 0) * (r.cantidad || 1))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registro Técnico & Horas Invertidas por el Mecánico */}
          <div className="rounded-2xl bg-neutral-950 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-red-500" /> Informe Técnico & Horas Invertidas
              </h4>
              {informeExito && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> ¡Informe Guardado!
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Horas Invertidas Aprox.</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ej. 2.5"
                  value={horasInvertidas}
                  onChange={(e) => setHorasInvertidas(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 font-mono text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Kilometraje Entrada</label>
                <input
                  type="number"
                  placeholder="Ej. 45000"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(Number(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 font-mono text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Diagnóstico & Hallazgos Técnicos de Revisión</label>
              <textarea
                rows={2}
                placeholder="Detalla fallas encontradas, estado de piezas, fugas o necesidad de mantenimientos futuros..."
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Observaciones / Notas de Progreso</label>
              <textarea
                rows={2}
                placeholder="Avances del trabajo, pruebas de ruta, calibraciones o recomendaciones..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <ButtonDS
              variant="primary"
              isLoading={isSavingInforme}
              onClick={handleGuardarInformeTecnico}
              className="w-full text-xs py-2.5 mt-1"
            >
              💾 Guardar Informe Técnico en Base de Datos
            </ButtonDS>
          </div>

          {/* Desglose Económico */}
          <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Desglose de Costo en BOB
            </h4>
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Mano de Obra & Servicios:</span>
              <span className="font-mono text-neutral-200">{currencyFormatter.format(costoServicios)}</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Repuestos e Insumos:</span>
              <span className="font-mono text-neutral-200">{currencyFormatter.format(costoRepuestos)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-neutral-100 pt-2 border-t border-white/10">
              <span>Costo Total Estimado:</span>
              <span className="font-mono text-red-400">{currencyFormatter.format(totalCosto > 0 ? totalCosto : 150)}</span>
            </div>
          </div>

          {/* Regresión de Estado Modal Callout */}
          {estadoActual === "En revisión" && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Opción de Reapertura (Regresión de Estado)</span>
              </div>
              <p className="text-xs text-neutral-400">
                Si durante la revisión técnica se identifican fallos pendientes, puedes regresar el trabajo a "En progreso" ingresando una nota de auditoría.
              </p>
              <ButtonDS
                variant="outline-red"
                onClick={() => setShowRegresionModal(true)}
                className="w-full text-xs py-2 mt-2"
              >
                🔄 Reabrir a "En progreso" con Nota
              </ButtonDS>
            </div>
          )}

          {/* Auditoría / Timeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-red-400" /> Historial de Auditoría OT
            </h4>
            <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                <div>
                  <p className="font-semibold text-neutral-200">Trabajo Asignado / Registrado</p>
                  <p className="text-[11px] text-neutral-500">
                    {dateFormatter.format(new Date())} por Sistema ADN Motors
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 bg-neutral-950">
          <ButtonDS variant="secondary" fullWidth onClick={onClose}>
            Cerrar Panel
          </ButtonDS>
        </div>
      </div>

      {/* Regresión Nota Modal */}
      {showRegresionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl bg-neutral-900 border border-white/10 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Nota de Auditoría Requerida
            </h3>
            <p className="text-xs text-neutral-300">
              Debes detallar la razón técnica por la que el vehículo reingresa a "En progreso":
            </p>
            <textarea
              rows={3}
              value={notaRegresion}
              onChange={(e) => setNotaRegresion(e.target.value)}
              placeholder="Ej: Se detectó una fuga menor en la manguera durante el test drive..."
              className="w-full rounded-xl bg-neutral-950 border border-white/10 p-3 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {errorLocal && <p className="text-xs text-red-400 font-semibold">{errorLocal}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <ButtonDS variant="secondary" onClick={() => setShowRegresionModal(false)}>
                Cancelar
              </ButtonDS>
              <ButtonDS variant="primary" isLoading={isSubmitting} onClick={handleEjecutarRegresion}>
                Confirmar Reingreso
              </ButtonDS>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
