import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X, Car, User, Clock, Phone, FileText, CheckCircle2, ShieldAlert, Wrench,
  DollarSign, AlertTriangle, Calendar, History, ArrowRight, Printer, Tag,
  Camera, Upload, Trash2, ZoomIn, Image as ImageIcon
} from "lucide-react";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import {
  type EstadoTrabajoType,
  getCodigoOT,
  formatRangoHoras,
  currencyFormatter,
  dateFormatter,
} from "@/features/empleado/stateMachine";
import type { Trabajo } from "@/api/citaApi";
import { subirFotoTrabajo, eliminarFotoTrabajo } from "@/api/citaApi";
import { API_BASE } from "@/api/config";
import { getToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface DetalleTrabajoDrawerProps {
  trabajo: Trabajo | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerarFactura?: (citaId: string) => void;
}

interface HistorialVehiculoItem {
  id: string;
  fecha_cita: string;
  mecanico: string;
  estado: string;
  kilometraje: number;
  servicios: string;
  repuestos: string;
  costo_total: number;
}

export const DetalleTrabajoDrawer: React.FC<DetalleTrabajoDrawerProps> = ({
  trabajo,
  isOpen,
  onClose,
  onGenerarFactura
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"detalle" | "historial" | "fotos">("detalle");
  const [historialVehiculo, setHistorialVehiculo] = useState<HistorialVehiculoItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [fotosList, setFotosList] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  const vehiculoPlaca = trabajo?.placa || "SIN PLACA";

  useEffect(() => {
    if (trabajo) {
      setFotosList(trabajo.fotos || []);
    }
  }, [trabajo]);

  useEffect(() => {
    if (isOpen && activeTab === "historial" && vehiculoPlaca && vehiculoPlaca !== "SIN PLACA") {
      const cargarHistorial = async () => {
        setLoadingHistorial(true);
        try {
          const token = getToken();
          const res = await axios.get(`${API_BASE}/api/citas/admin/vehiculo/${vehiculoPlaca}/historial`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setHistorialVehiculo(res.data.historial || []);
          }
        } catch (err) {
          console.warn("Error cargando historial de vehículo:", err);
        } finally {
          setLoadingHistorial(false);
        }
      };
      cargarHistorial();
    }
  }, [isOpen, activeTab, vehiculoPlaca]);

  if (!isOpen || !trabajo) return null;

  const codigoOT = getCodigoOT(trabajo.id);
  const clienteNombre = trabajo.cliente || "Cliente Taller";
  const clienteTel = trabajo.cliente_telefono || "70000000";
  const clienteEmail = trabajo.cliente_email || "N/A";

  const vehiculoMarca = trabajo.vehiculo_marca || "Auto";
  const vehiculoModelo = trabajo.vehiculo_modelo || "";
  const vehiculoAnio = trabajo.vehiculo_anio || 2022;
  const kilometraje = trabajo.kilometraje || 0;

  const estadoActual = (trabajo.estado || "Agendado") as EstadoTrabajoType;
  const serviciosList = trabajo.servicios_detalle || [];
  const repuestosList = trabajo.repuestos || [];

  const subtotalServicios = trabajo.costo_servicios || serviciosList.reduce((acc, s) => acc + Number(s.costo), 0);
  const subtotalRepuestos = trabajo.costo_repuestos || repuestosList.reduce((acc, r) => acc + Number(r.subtotal), 0);
  const subtotalBruto = trabajo.subtotal_bruto || (subtotalServicios + subtotalRepuestos);
  const descuento = trabajo.descuento || 0;
  const totalFinal = trabajo.costo_total || Math.max(0, subtotalBruto - descuento);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Archivo muy pesado", description: "El tamaño máximo permitido por foto es 8 MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = reader.result as string;
      setSubiendoFoto(true);
      try {
        const token = getToken();
        const res = await subirFotoTrabajo(token!, trabajo.id, base64Str);
        if (res.success) {
          setFotosList(res.fotos);
          toast({ title: "Evidencia Subida", description: "La fotografía fue subida con éxito a Cloudinary" });
        }
      } catch (err: any) {
        toast({ title: "Error al subir", description: err.response?.data?.error || err.message, variant: "destructive" });
      } finally {
        setSubiendoFoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEliminarFoto = async (fotoUrl: string) => {
    if (!window.confirm("¿Deseas eliminar esta foto de evidencia?")) return;
    try {
      const token = getToken();
      const res = await eliminarFotoTrabajo(token!, trabajo.id, fotoUrl);
      if (res.success) {
        setFotosList(res.fotos);
        toast({ title: "Foto Eliminada", description: "La fotografía fue removida de la orden" });
      }
    } catch (err: any) {
      toast({ title: "Error al eliminar", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const safeFormatFecha = (fechaRaw: any) => {
    if (!fechaRaw) return "Por definir en taller";
    const d = new Date(fechaRaw);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return "Por definir en taller";
    return dateFormatter.format(d);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-900 border-l border-white/10 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Sticky Header & Tabs Combo Container */}
        <div className="sticky top-0 z-20 bg-neutral-950/95 backdrop-blur-md border-b border-white/10">
          {/* Header Bar */}
          <div className="p-4 sm:p-6 pb-3 flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg">
                  {codigoOT}
                </span>
                <BadgeDS variant="neutral">{estadoActual}</BadgeDS>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100 mt-1 truncate">
                Orden de Trabajo — {clienteNombre}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onGenerarFactura && (
                <ButtonDS
                  variant="outline-red"
                  icon={<Printer className="h-4 w-4" />}
                  onClick={() => onGenerarFactura(trabajo.id)}
                  className="text-xs py-1.5 px-3"
                >
                  Factura / PDF
                </ButtonDS>
              )}
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Cerrar Ficha OT"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-4 sm:px-6 gap-2 overflow-x-auto pt-1 pb-0 no-scrollbar">
            <button
              onClick={() => setActiveTab("detalle")}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "detalle"
                  ? "border-red-500 text-red-400 bg-red-500/5 rounded-t-lg"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <FileText className="h-4 w-4" /> Detalle de la Orden
            </button>

            <button
              onClick={() => setActiveTab("fotos")}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "fotos"
                  ? "border-red-500 text-red-400 bg-red-500/5 rounded-t-lg"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Camera className="h-4 w-4" /> Evidencias Cloudinary ({fotosList.length})
            </button>

            <button
              onClick={() => setActiveTab("historial")}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "historial"
                  ? "border-red-500 text-red-400 bg-red-500/5 rounded-t-lg"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <History className="h-4 w-4" /> Historial ({vehiculoPlaca})
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {activeTab === "detalle" ? (
          <div className="p-6 space-y-6 flex-1">
            {/* Grid 1: Cliente & Vehículo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cliente */}
              <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-red-400" /> Propietario / Cliente
                </h4>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-neutral-100 text-sm">{clienteNombre}</p>
                  <p className="text-neutral-400 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-neutral-500" /> {clienteTel}
                  </p>
                  {clienteEmail && (
                    <p className="text-neutral-500 text-[11px] font-mono">{clienteEmail}</p>
                  )}
                </div>
              </div>

              {/* Vehículo */}
              <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-purple-400" /> Ficha del Vehículo
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-100 text-sm">
                      {vehiculoMarca} {vehiculoModelo} ({vehiculoAnio})
                    </span>
                    <span className="font-mono text-[11px] font-bold bg-neutral-900 border border-white/10 px-2 py-0.5 rounded text-neutral-200 uppercase">
                      {vehiculoPlaca}
                    </span>
                  </div>
                  <p className="text-neutral-400 flex items-center gap-1 pt-1">
                    <Tag className="h-3.5 w-3.5 text-neutral-500" /> Kilometraje: <strong className="text-neutral-200 font-mono">{kilometraje.toLocaleString("es-BO")} km</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 2: Asignación y Horarios */}
            <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-blue-400" /> Responsable & Fechas de Trabajo
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Mecánico Asignado</span>
                  <span className="font-semibold text-neutral-200 flex items-center gap-1 mt-0.5">
                    👨‍🔧 {trabajo.mecanico || "Por asignar"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Fecha de Ingreso</span>
                  <span className="font-semibold text-neutral-200 mt-0.5 block">
                    {safeFormatFecha(trabajo.fecha_cita)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Estimado Entrega</span>
                  <span className="font-semibold text-neutral-200 mt-0.5 block">
                    {safeFormatFecha(trabajo.fecha_estimada_entrega)}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnóstico & Observaciones */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-amber-400" /> Diagnóstico Técnico & Observaciones
              </h4>
              <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-3 text-xs">
                <div>
                  <span className="text-neutral-500 font-bold uppercase text-[10px] block">Problema Informado / Diagnóstico</span>
                  <p className="text-neutral-200 mt-1 leading-relaxed">{trabajo.diagnostico || trabajo.observaciones || "Revisión general de taller."}</p>
                </div>
                {trabajo.observaciones && trabajo.observaciones !== trabajo.diagnostico && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-neutral-500 font-bold uppercase text-[10px] block">Observaciones adicionales</span>
                    <p className="text-neutral-400 mt-0.5">{trabajo.observaciones}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Servicios Registrados */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Servicios Realizados ({serviciosList.length})
                </span>
                <span className="font-mono font-bold text-neutral-300">
                  Subtotal: {currencyFormatter.format(subtotalServicios)}
                </span>
              </h4>
              <div className="space-y-2">
                {serviciosList.map((s, idx) => (
                  <div key={idx} className="rounded-xl bg-neutral-950 border border-white/5 p-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-200">{s.descripcion}</span>
                    <span className="font-mono font-bold text-neutral-300">{currencyFormatter.format(Number(s.costo))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repuestos / Insumos Utilizados */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-purple-400" /> Repuestos e Insumos ({repuestosList.length})
                </span>
                <span className="font-mono font-bold text-neutral-300">
                  Subtotal: {currencyFormatter.format(subtotalRepuestos)}
                </span>
              </h4>
              {repuestosList.length === 0 ? (
                <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 text-xs text-neutral-500 text-center">
                  Sin repuestos de inventario cargados a esta OT.
                </div>
              ) : (
                <div className="space-y-2">
                  {repuestosList.map((r, idx) => (
                    <div key={idx} className="rounded-xl bg-neutral-950 border border-white/5 p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-neutral-200">{r.nombre}</span>
                        <span className="font-mono text-[10px] text-neutral-500 block">Código: {r.codigo} | Cantidad: {r.cantidad}u</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-300">{currencyFormatter.format(Number(r.subtotal))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Económico */}
            <div className="rounded-2xl bg-neutral-950 border border-white/10 p-5 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-3">
                <DollarSign className="h-4 w-4 text-emerald-400" /> Resumen Económico Oficial (BOB)
              </h4>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Mano de Obra & Servicios:</span>
                <span className="font-mono text-neutral-200">{currencyFormatter.format(subtotalServicios)}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Repuestos de Inventario:</span>
                <span className="font-mono text-neutral-200">{currencyFormatter.format(subtotalRepuestos)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Descuento Especial:</span>
                  <span className="font-mono">- {currencyFormatter.format(descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-neutral-100 pt-3 border-t border-white/10">
                <span>TOTAL FINAL A PAGAR:</span>
                <span className="font-mono text-red-400">{currencyFormatter.format(totalFinal)}</span>
              </div>
            </div>

            {/* Historial de Auditoría OT */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-red-400" /> Historial de Cambios de Estado (Auditoría)
              </h4>
              <div className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-3 text-xs">
                {(trabajo.historial_estados || []).map((h, i) => (
                  <div key={i} className="flex items-start gap-3 pb-2 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-neutral-200">{h.estado} <span className="text-neutral-500 text-[11px] font-normal">(anterior: {h.estado_anterior || "N/A"})</span></p>
                      <p className="text-[11px] text-neutral-400">{h.observaciones || "Cambio registrado en sistema"}</p>
                      <span className="text-[10px] font-mono text-neutral-500">{h.fecha_cambio ? dateFormatter.format(new Date(h.fecha_cambio)) : "Fecha desconocida"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === "fotos" ? (
          /* Cloudinary Fotos Tab */
          <div className="p-6 space-y-5 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-red-500" />
                  Fotografías & Evidencias del Trabajo
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Fotos de repuestos viejos cambiados, respaldos de reparación e inspecciones (Cloudinary).
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-red-600/20">
                <Upload className="h-4 w-4" />
                {subiendoFoto ? "Subiendo a Cloudinary..." : "Subir Foto"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={subiendoFoto}
                  className="hidden"
                />
              </label>
            </div>

            {fotosList.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-neutral-950 border border-white/5 space-y-3">
                <ImageIcon className="h-10 w-10 text-neutral-600 mx-auto" />
                <p className="text-xs font-semibold text-neutral-300">No hay fotos de evidencia adjuntas a esta Orden.</p>
                <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  Sube fotos de los repuestos retirados o el progreso técnico para brindar transparencia total al cliente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fotosList.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 bg-neutral-950 aspect-square">
                    <img
                      src={url}
                      alt={`Evidencia ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                      onClick={() => setFotoModalUrl(url)}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => setFotoModalUrl(url)}
                        className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                        title="Ver imagen completa"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEliminarFoto(url)}
                        className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                        title="Eliminar evidencia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Zoom Foto */}
            {fotoModalUrl && (
              <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                <div className="relative max-w-4xl max-h-[90vh] bg-neutral-950 rounded-2xl border border-white/10 p-2 overflow-hidden shadow-2xl">
                  <button
                    onClick={() => setFotoModalUrl(null)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/60 text-white hover:bg-black transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                  <img
                    src={fotoModalUrl}
                    alt="Evidencia Zoom"
                    className="max-h-[85vh] w-auto object-contain rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Historial de Vehículo Tab */
          <div className="p-6 space-y-4 flex-1">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Car className="h-4 w-4 text-purple-400" />
              Historial de Trabajos del Vehículo: <span className="font-mono text-red-400 uppercase">{vehiculoPlaca}</span>
            </h3>

            {loadingHistorial ? (
              <div className="p-8 text-center text-neutral-400 text-xs animate-pulse">
                Cargando historial del vehículo desde la base de datos...
              </div>
            ) : historialVehiculo.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs rounded-2xl bg-neutral-950 border border-white/5">
                No se encontraron mantenimientos o trabajos previos registrados para este vehículo.
              </div>
            ) : (
              <div className="space-y-3">
                {historialVehiculo.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-neutral-950 border border-white/5 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-mono font-bold text-red-400">{getCodigoOT(item.id)}</span>
                      <BadgeDS variant="neutral">{item.estado}</BadgeDS>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-neutral-400 pt-1">
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase">Mecánico</span>
                        <span className="font-medium text-neutral-200">{item.mecanico}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase">Kilometraje</span>
                        <span className="font-mono text-neutral-200">{item.kilometraje ? item.kilometraje.toLocaleString("es-BO") : 0} km</span>
                      </div>
                    </div>
                    {item.servicios && (
                      <div className="pt-1">
                        <span className="text-neutral-500 block text-[10px] uppercase">Servicios</span>
                        <span className="text-neutral-300">{item.servicios}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-neutral-500 font-mono text-[11px]">{dateFormatter.format(new Date(item.fecha_cita))}</span>
                      <span className="font-mono font-bold text-emerald-400">{currencyFormatter.format(item.costo_total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 bg-neutral-950">
          <ButtonDS variant="secondary" fullWidth onClick={onClose}>
            Cerrar Ficha
          </ButtonDS>
        </div>
      </div>
    </div>
  );
};
