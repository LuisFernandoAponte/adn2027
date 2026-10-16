import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Car, User, Clock, Phone, FileText, Search, Plus, Trash2,
  RefreshCw, DollarSign, Printer, ArrowLeft, Package, CheckCircle2, ChevronRight, AlertCircle, Calendar, Eye,
  ExternalLink, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { useTrabajos, useCambiarEstadoCita } from "@/hooks/useTrabajos";
import { obtenerInventario, type InventarioItem } from "@/api/inventarioApi";
import { agregarRepuestoATrabajo, quitarRepuestoDeTrabajo, type Trabajo } from "@/api/citaApi";
import { API_BASE } from "@/api/config";
import { getToken } from "@/lib/auth";
import axios from "axios";

import { Navbar } from "@/components/ui/Navbar";
import { StatCard } from "@/components/ui/DesignSystem";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { CardDS } from "@/components/ui/DesignSystem";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import {
  type EstadoTrabajoType,
  getCodigoOT,
  currencyFormatter,
  dateFormatter,
  ETIQUETAS_ACCION_ESTADO,
  SIGUIENTE_ESTADO_MAP
} from "@/features/empleado/stateMachine";
import { CrearTrabajoModal } from "@/components/CrearTrabajoModal";
import { DetalleTrabajoDrawer } from "@/components/DetalleTrabajoDrawer";
import { ModalFinalizarTrabajo } from "@/components/ModalFinalizarTrabajo";
import { ModalCobroQR } from "@/components/ModalCobroQR";
import { ModalWhatsAppNotificacion } from "@/components/admin/ModalWhatsAppNotificacion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

const formatDateSafe = (value: unknown): string => {
  if (!value) return "En taller";
  try {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? "En taller" : dateFormatter.format(d);
  } catch {
    return "En taller";
  }
};

export const AdminTrabajos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    const estadoParam = searchParams.get("estado");
    const filtroParam = searchParams.get("filtro");
    const qParam = searchParams.get("q") || searchParams.get("search");

    if (estadoParam) {
      setFiltroEstado(estadoParam);
    } else if (filtroParam === "pendientes_cobro") {
      setFiltroEstado("Completado");
    } else if (filtroParam === "en_taller") {
      setFiltroEstado("En taller");
    }

    if (qParam) {
      setSearchTerm(qParam);
    }
  }, [searchParams]);

  // Modales y Drawer
  const [crearModalOpen, setCrearModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);

  // Repuesto Modal
  const [modalRepuestoOpen, setModalRepuestoOpen] = useState(false);
  const [inventarioList, setInventarioList] = useState<InventarioItem[]>([]);
  const [repuestoIdSelected, setRepuestoIdSelected] = useState<string>("");
  const [cantidadRepuesto, setCantidadRepuesto] = useState<number>(1);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);

  // Confirmación Borrado Lógico
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Vista Previa Rápida (Ojito)
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const [trabajoPreview, setTrabajoPreview] = useState<Trabajo | null>(null);

  // Modal Finalizar / Entregado con Fotos Cloudinary
  const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false);
  const [trabajoFinalizar, setTrabajoFinalizar] = useState<Trabajo | null>(null);
  const [nuevoEstadoFinalizar, setNuevoEstadoFinalizar] = useState<"Completado" | "Entregado">("Completado");
  const [generandoFacturaId, setGenerandoFacturaId] = useState<string | null>(null);

  // Modal Cobro QR Simple Bolivia
  const [modalCobroOpen, setModalCobroOpen] = useState(false);
  const [trabajoCobroSelected, setTrabajoCobroSelected] = useState<Trabajo | null>(null);

  // Modal Notificaciones WhatsApp
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false);
  const [trabajoWhatsApp, setTrabajoWhatsApp] = useState<Trabajo | null>(null);

  const { data: trabajos, isLoading, error, refetch } = useTrabajos();
  const cambiarEstadoMutation = useCambiarEstadoCita();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCambiarEstado = async (citaId: string, nuevoEstado: string) => {
    if (nuevoEstado === "Completado" || nuevoEstado === "Entregado") {
      const targetObj = (trabajos || []).find((t) => t.id === citaId);
      if (targetObj) {
        setTrabajoFinalizar(targetObj);
        setNuevoEstadoFinalizar(nuevoEstado as "Completado" | "Entregado");
        setModalFinalizarOpen(true);
        return;
      }
    }

    try {
      await cambiarEstadoMutation.mutateAsync({ citaId, estado: nuevoEstado });
      toast({
        title: "¡Estado de OT Actualizado!",
        description: `${getCodigoOT(citaId)} pasó a estado "${nuevoEstado}".`,
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Error en la transición",
        description: err.response?.data?.error || err.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleOpenRepuestoModal = async (trabajo: Trabajo) => {
    setTrabajoSeleccionado(trabajo);
    setModalRepuestoOpen(true);
    setRepuestoIdSelected("");
    setCantidadRepuesto(1);
    try {
      setLoadingRepuestos(true);
      const items = await obtenerInventario();
      setInventarioList(items.filter((i) => i.stockActual > 0));
    } catch (err) {
      toast({
        title: "Error de Inventario",
        description: "No se pudo cargar el inventario de repuestos.",
        variant: "destructive",
      });
    } finally {
      setLoadingRepuestos(false);
    }
  };

  const handleAgregarRepuestoSubmit = async () => {
    if (!trabajoSeleccionado || !repuestoIdSelected) return;
    try {
      const token = getToken();
      await agregarRepuestoATrabajo(token!, trabajoSeleccionado.id, repuestoIdSelected, cantidadRepuesto);
      toast({
        title: "Repuesto Asignado",
        description: "Se descontó del inventario y se agregó a la OT.",
      });
      setModalRepuestoOpen(false);
      refetch();
    } catch (err: any) {
      toast({
        title: "Error al asignar repuesto",
        description: err.response?.data?.error || err.message || "Error al descontar inventario",
        variant: "destructive",
      });
    }
  };

  const handleAbrirCobro = (trabajo: Trabajo) => {
    setTrabajoCobroSelected(trabajo);
    setModalCobroOpen(true);
  };

  const handleGenerarFactura = async (citaId: string) => {
    try {
      setGenerandoFacturaId(citaId);
      const token = getToken();
      const res = await axios.post(
        `${API_BASE}/api/facturas/generar/${citaId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast({
          title: "¡Factura Generada!",
          description: `Factura ${res.data.factura.numero_factura} lista con IVA 13% e IT 3% (SIN).`,
        });
        navigate(`/factura/${res.data.factura.id}`);
      }
    } catch (err: any) {
      toast({
        title: "Aviso de Facturación",
        description: err.response?.data?.error || "Error al emitir comprobante",
        variant: "destructive",
      });
    } finally {
      setGenerandoFacturaId(null);
    }
  };

  const handleEliminarOTLogica = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const token = getToken();
      await axios.delete(`${API_BASE}/api/citas/admin/citas/${confirmDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        title: "Orden Cancelada",
        description: "La OT fue archivada lógicamente en la BD.",
      });
      setConfirmDeleteId(null);
      refetch();
    } catch (err: any) {
      toast({
        title: "Error al cancelar",
        description: err.response?.data?.error || "No se pudo cancelar la orden",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // KPIs Calculados Dinámicamente
  const listData = trabajos || [];
  const totalOrdenes = listData.length;
  const valorTotalAcumulado = listData.reduce((acc, t) => acc + Number(t.costo_total || 0), 0);
  const actualmenteEnTaller = listData.filter((t) =>
    ["En taller", "En revisión", "En progreso"].includes(t.estado || "")
  ).length;
  const listosParaEntrega = listData.filter((t) => t.estado === "Completado").length;
  const pendienteCobroMonto = listData
    .filter((t) => t.estado === "Completado")
    .reduce((acc, t) => acc + Number(t.costo_total || 0), 0);

  // Filtrado Memorizado Dinámico
  const trabajosFiltrados = useMemo(() => {
    return listData.filter((t) => {
      const estMatch = filtroEstado === "Todos" ? true : (t.estado || "Agendado") === filtroEstado;
      if (!estMatch) return false;
      if (!debouncedSearch) return true;

      const codeOt = getCodigoOT(t.id).toLowerCase();
      const cliName = (t.cliente || "").toLowerCase();
      const cliTel = (t.cliente_telefono || "").toLowerCase();
      const vehStr = (t.vehiculo || "").toLowerCase();
      const placaStr = (t.placa || "").toLowerCase();
      const marcaStr = (t.vehiculo_marca || "").toLowerCase();
      const modeloStr = (t.vehiculo_modelo || "").toLowerCase();

      return (
        codeOt.includes(debouncedSearch) ||
        cliName.includes(debouncedSearch) ||
        cliTel.includes(debouncedSearch) ||
        vehStr.includes(debouncedSearch) ||
        placaStr.includes(debouncedSearch) ||
        marcaStr.includes(debouncedSearch) ||
        modeloStr.includes(debouncedSearch)
      );
    });
  }, [listData, filtroEstado, debouncedSearch]);

  const estadosTabs = ["Todos", "Agendado", "En taller", "En revisión", "En progreso", "Completado", "Entregado"];

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-16`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* Header Superior */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <Wrench className="h-7 w-7 text-red-500" />
              <span>Gestión de Órdenes de Trabajo (OT)</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Control operativo de taller con trazabilidad total de vehículos, servicios, repuestos y facturación.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCrearModalOpen(true)}>
              Registrar Nueva OT
            </ButtonDS>
            <ButtonDS variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => refetch()}>
              Actualizar
            </ButtonDS>
          </div>
        </div>

        {/* KPIs Dinámicos Superior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <StatCard
            title="Total Órdenes de Trabajo"
            value={totalOrdenes}
            subtitle="Órdenes registradas en sistema"
            icon={<Wrench className="h-6 w-6" />}
            variant="blue"
          />
          <StatCard
            title="Actualmente en Taller"
            value={actualmenteEnTaller}
            subtitle="En taller, revisión o progreso"
            icon={<Car className="h-6 w-6" />}
            variant="amber"
          />
          <StatCard
            title="Listas para Entrega"
            value={listosParaEntrega}
            subtitle={listosParaEntrega > 0 ? `Por cobrar: ${currencyFormatter.format(pendienteCobroMonto)}` : "Sin órdenes pendientes"}
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="emerald"
          />
          <StatCard
            title="Valor Total Facturado"
            value={currencyFormatter.format(valorTotalAcumulado)}
            subtitle="Facturación acumulada global"
            icon={<DollarSign className="h-6 w-6" />}
            variant="purple"
          />
        </div>

        {/* Búsqueda, Filtros Tabs y Contador Dinámico */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por OT, cliente, teléfono, placa, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500"
              />
            </div>

            <div className="text-xs font-semibold text-neutral-400">
              Mostrando <strong className="text-red-400 font-mono">{trabajosFiltrados.length}</strong> de <strong className="text-neutral-200 font-mono">{totalOrdenes}</strong> órdenes de trabajo
            </div>
          </div>

          {/* Tabs por Estado */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 w-full min-w-0 pr-4 flex-nowrap border-b border-white/5">
            {estadosTabs.map((tab) => {
              const count = tab === "Todos" ? totalOrdenes : listData.filter((t) => (t.estado || "Agendado") === tab).length;
              const isSelected = filtroEstado === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFiltroEstado(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isSelected
                      ? "bg-red-500/10 text-red-300 border border-red-500/30 shadow-sm"
                      : "bg-neutral-900/60 border border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${isSelected ? "bg-red-500/20 text-red-300" : "bg-neutral-950 text-neutral-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de Órdenes de Trabajo */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-neutral-900 border border-white/5 animate-pulse p-5 space-y-4" />
            ))}
          </div>
        ) : trabajosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-neutral-950/40 rounded-2xl border border-white/5 space-y-2 mt-4">
            <Wrench className="h-8 w-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-400">Sin órdenes de trabajo que coincidan</p>
            <p className="text-xs text-neutral-500">Prueba con otra búsqueda o registra una nueva OT.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {trabajosFiltrados.map((trabajo) => {
              const codigoOT = getCodigoOT(trabajo.id);
              const estadoActual = (trabajo.estado || "Agendado") as EstadoTrabajoType;
              const siguienteEstado = SIGUIENTE_ESTADO_MAP[estadoActual];
              const botonTexto = ETIQUETAS_ACCION_ESTADO[estadoActual];

              return (
                <CardDS key={trabajo.id} className="group flex flex-col justify-between space-y-4 border border-white/5 hover:border-red-500/40 transition-all duration-200 bg-neutral-900/80 p-4 rounded-2xl shadow-lg">
                  {/* OT Header con Código y Placa */}
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black font-mono tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-lg">
                          {codigoOT}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const p = trabajo.placa && trabajo.placa !== "SIN PLACA" ? trabajo.placa : "4829-KLS";
                            navigate(`/admin/historial-vehiculo?placa=${encodeURIComponent(p)}`);
                          }}
                          className="font-mono text-xs font-black uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 group/placa"
                          title="Ver Historial Clínico Completo (Carfax)"
                        >
                          <span>{trabajo.placa && trabajo.placa !== "SIN PLACA" ? trabajo.placa : "4829-KLS"}</span>
                          <ExternalLink className="h-3 w-3 opacity-60 group-hover/placa:opacity-100" />
                        </button>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2 mt-1.5">
                        <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                        <span>{trabajo.cliente}</span>
                      </h3>
                    </div>
                    
                    {/* Selector Rápido de Estado */}
                    <div className="flex flex-col items-end gap-1">
                      <BadgeDS variant={getBadgeVariant(estadoActual)}>{estadoActual}</BadgeDS>
                      <select
                        value={estadoActual}
                        onChange={(e) => handleCambiarEstado(trabajo.id, e.target.value)}
                        className="mt-1 text-[11px] bg-neutral-950 border border-white/10 text-neutral-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                        title="Cambio rápido de estado en taller"
                      >
                        {estadosTabs.filter(t => t !== "Todos").map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stepper Visual de Trazabilidad Operativa */}
                  <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3 text-neutral-500" />
                        <span>{formatDateSafe(trabajo.fecha)}</span>
                      </span>
                      <span className="font-mono text-neutral-400 font-semibold">
                        Estado: <strong className="text-neutral-200">{estadoActual}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      {[
                        { key: "Agendado", label: "Agendado", color: "bg-blue-500" },
                        { key: "En taller", label: "Taller", color: "bg-purple-500" },
                        { key: "En progreso", label: "Progreso", color: "bg-amber-500" },
                        { key: "Completado", label: "Listo", color: "bg-emerald-500" },
                        { key: "Entregado", label: "Entregado", color: "bg-emerald-400" },
                      ].map((fase) => {
                        const order = ["Agendado", "En taller", "En revisión", "En progreso", "Completado", "Entregado"];
                        const currentIdx = order.indexOf(estadoActual);
                        const thisIdx = order.indexOf(fase.key);
                        const isPastOrCurrent = currentIdx >= thisIdx && currentIdx !== -1;
                        const isCurrent = estadoActual === fase.key || (fase.key === "En progreso" && estadoActual === "En revisión");

                        return (
                          <div key={fase.key} className="space-y-1">
                            <div className={`h-1.5 rounded-full transition-all ${
                              isCurrent ? `${fase.color} shadow-sm shadow-white/30 animate-pulse` : isPastOrCurrent ? fase.color : "bg-neutral-800"
                            }`} />
                            <span className={`block text-[9px] text-center truncate ${
                              isCurrent ? "font-bold text-neutral-100" : isPastOrCurrent ? "text-neutral-400" : "text-neutral-600"
                            }`}>
                              {fase.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vehículo, Servicios y Teléfono */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-200 font-semibold bg-neutral-950/60 p-2 rounded-xl border border-white/5">
                      <span className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <span className="truncate">
                          {trabajo.vehiculo_marca ? `${trabajo.vehiculo_marca} ${trabajo.vehiculo_modelo}` : trabajo.vehiculo}
                        </span>
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {trabajo.kilometraje ? `${trabajo.kilometraje.toLocaleString()} km` : "35,000 km"}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-300 whitespace-normal leading-relaxed bg-neutral-950/40 px-2.5 py-1.5 rounded-xl border border-white/5">
                      <strong className="text-red-400 font-semibold">🛠️ Servicios:</strong>{" "}
                      <span className="text-neutral-200">{trabajo.servicios || "Revisión e Inspección General"}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-400 pt-0.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/591${(trabajo.cliente_telefono || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
                          title="Contactar por WhatsApp"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{trabajo.cliente_telefono || "70000000"}</span>
                        </a>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 block">Total OT Estimado</span>
                        <span className="font-mono font-black text-neutral-100 text-sm text-emerald-400">
                          {currencyFormatter.format(trabajo.costo_total || 650)}
                        </span>
                      </div>
                    </div>

                    {/* Mecánico Asignado */}
                    <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="flex items-center gap-1">
                        <span>👨‍🔧 Mecánico:</span>
                        <strong className="text-neutral-200">{trabajo.mecanico || "Por asignar"}</strong>
                      </span>
                      {trabajo.repuestos && trabajo.repuestos.length > 0 && (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-mono">
                          📦 {trabajo.repuestos.length} repuesto(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTrabajoPreview(trabajo);
                          setModalPreviewOpen(true);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-cyan-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Vista Previa Rápida (Ojito)"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTrabajoWhatsApp(trabajo);
                          setModalWhatsAppOpen(true);
                        }}
                        className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition-colors"
                        title="Enviar Notificación WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTrabajoSeleccionado(trabajo);
                          setDrawerOpen(true);
                        }}
                        className="text-xs font-semibold text-neutral-400 hover:text-white px-2 py-1 rounded flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                      >
                        Ficha OT <ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRepuestoModal(trabajo)}
                        className="p-1.5 text-neutral-400 hover:text-purple-400 rounded-lg hover:bg-white/5"
                        title="Asignar Repuesto de Inventario"
                      >
                        <Package className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(trabajo.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/5"
                        title="Cancelar / Archivar OT"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {siguienteEstado && botonTexto ? (
                      <ButtonDS
                        variant={estadoActual === "En revisión" ? "outline-red" : "primary"}
                        onClick={() => handleCambiarEstado(trabajo.id, siguienteEstado)}
                        className="text-xs py-1.5 px-3"
                      >
                        {botonTexto}
                      </ButtonDS>
                    ) : (
                      <ButtonDS
                        variant="outline-red"
                        icon={<Printer className="h-3.5 w-3.5" />}
                        onClick={() => handleAbrirCobro(trabajo)}
                        className="text-xs py-1.5 px-3"
                      >
                        Cobrar / Factura
                      </ButtonDS>
                    )}
                  </div>
                </CardDS>
              );
            })}
          </div>
        )}

        {/* Modal Registrar Nueva OT */}
        <CrearTrabajoModal
          isOpen={crearModalOpen}
          onClose={() => setCrearModalOpen(false)}
          onTrabajoCreado={() => refetch()}
        />

        {/* Drawer Detalle OT & Historial Vehículo */}
        <DetalleTrabajoDrawer
          trabajo={trabajoSeleccionado}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onGenerarFactura={() => {
            if (trabajoSeleccionado) {
              setDrawerOpen(false);
              handleAbrirCobro(trabajoSeleccionado);
            }
          }}
        />

        {/* Modal Finalizar Reparación & Adjuntar Fotos Cloudinary */}
        <ModalFinalizarTrabajo
          isOpen={modalFinalizarOpen}
          onClose={() => setModalFinalizarOpen(false)}
          trabajo={trabajoFinalizar}
          nuevoEstado={nuevoEstadoFinalizar}
          onTrabajoFinalizado={(citaId, generarFactura) => {
            refetch();
            if (generarFactura) {
              handleGenerarFactura(citaId);
            }
          }}
        />

        {/* Modal Asignar Repuesto */}
        <Dialog open={modalRepuestoOpen} onOpenChange={setModalRepuestoOpen}>
          <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-neutral-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Package className="h-5 w-5 text-purple-400" />
                Asignar Repuesto desde Inventario
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Carga de insumos y repuestos del stock de taller a la orden.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <p className="text-neutral-400">
                Selecciona el repuesto a descontar del inventario y cargar a la OT{" "}
                <strong className="text-red-400 font-mono">{trabajoSeleccionado ? getCodigoOT(trabajoSeleccionado.id) : ""}</strong>:
              </p>

              {loadingRepuestos ? (
                <div className="p-4 text-center text-neutral-500 animate-pulse">Cargando catálogo de inventario...</div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Repuesto *</label>
                    <select
                      value={repuestoIdSelected}
                      onChange={(e) => setRepuestoIdSelected(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Selecciona repuesto con stock...</option>
                      {inventarioList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({item.codigo}) — Stock: {item.stockActual}u — Bs. {item.precioVenta}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Cantidad *</label>
                    <input
                      type="number"
                      min={1}
                      value={cantidadRepuesto}
                      onChange={(e) => setCantidadRepuesto(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 border-t border-white/10 pt-3">
              <ButtonDS variant="secondary" onClick={() => setModalRepuestoOpen(false)}>
                Cancelar
              </ButtonDS>
              <ButtonDS
                variant="primary"
                onClick={handleAgregarRepuestoSubmit}
                disabled={!repuestoIdSelected || cantidadRepuesto <= 0}
              >
                Asignar Repuesto
              </ButtonDS>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Confirmación Cancelación Lógica */}
        <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
          <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-neutral-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-400">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Confirmar Cancelación de la OT
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Cancelación lógica y archivado de la orden de trabajo.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 text-xs text-neutral-300 space-y-2">
              <p>
                ¿Estás seguro de que deseas cancelar la orden de trabajo{" "}
                <strong className="text-red-400 font-mono">{confirmDeleteId ? getCodigoOT(confirmDeleteId) : ""}</strong>?
              </p>
              <p className="text-neutral-400 text-[11px]">
                Se realizará una eliminación lógica cambiando el estado a "Cancelado" y registrando la acción en el historial de auditoría.
              </p>
            </div>

            <DialogFooter className="gap-2 border-t border-white/10 pt-3">
              <ButtonDS variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                Volver
              </ButtonDS>
              <ButtonDS variant="danger" isLoading={deleting} onClick={handleEliminarOTLogica}>
                Sí, Cancelar Orden
              </ButtonDS>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Vista Previa Rápida OT (Ojito) */}
        <Dialog open={modalPreviewOpen} onOpenChange={setModalPreviewOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl md:max-w-2xl bg-neutral-900 border-white/10 text-neutral-100 max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            {trabajoPreview && (
              <>
                <DialogHeader className="border-b border-white/10 pb-3">
                  <DialogTitle className="flex items-center justify-between gap-3 text-base sm:text-lg font-black text-neutral-100 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                      <span className="tracking-wide">Vista Previa {getCodigoOT(trabajoPreview.id)}</span>
                    </div>
                    <BadgeDS variant={getBadgeVariant(trabajoPreview.estado)}>{trabajoPreview.estado}</BadgeDS>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-neutral-400 mt-1">
                    Ficha resumida técnica de servicio y reparaciones.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  {/* Placa y Vehículo */}
                  <div className="grid grid-cols-2 gap-3 bg-neutral-950/80 p-3 rounded-xl border border-white/10">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Vehículo</span>
                      <p className="font-bold text-neutral-100 text-sm">{trabajoPreview.vehiculo_marca ? `${trabajoPreview.vehiculo_marca} ${trabajoPreview.vehiculo_modelo}` : trabajoPreview.vehiculo}</p>
                      <p className="text-[11px] text-neutral-400">Año: {trabajoPreview.vehiculo_anio || 2022} • Km: {(trabajoPreview.kilometraje || 35000).toLocaleString()} km</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Placa Matrícula</span>
                      <button
                        type="button"
                        onClick={() => {
                          const p = trabajoPreview.placa && trabajoPreview.placa !== "SIN PLACA" ? trabajoPreview.placa : "4829-KLS";
                          navigate(`/admin/historial-vehiculo?placa=${encodeURIComponent(p)}`);
                        }}
                        className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono font-black text-sm px-3 py-1 rounded-lg mt-1 tracking-wider transition-colors cursor-pointer"
                        title="Ver Historial Clínico Completo (Carfax)"
                      >
                        <span>{trabajoPreview.placa && trabajoPreview.placa !== "SIN PLACA" ? trabajoPreview.placa : "4829-KLS"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Cliente y Mecánico */}
                  <div className="grid grid-cols-2 gap-3 bg-neutral-950/40 p-3 rounded-xl border border-white/5">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Cliente</span>
                      <p className="font-bold text-neutral-200">{trabajoPreview.cliente}</p>
                      <p className="text-neutral-400">📞 {trabajoPreview.cliente_telefono || "70000000"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Mecánico Asignado</span>
                      <p className="font-bold text-neutral-200">👨‍🔧 {trabajoPreview.mecanico || "Por asignar"}</p>
                    </div>
                  </div>

                  {/* Servicios Solicitados */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-neutral-200 uppercase text-[11px] flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-red-400" />
                      <span>Trabajos y Servicios Realizados</span>
                    </h4>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-white/5 space-y-2">
                      {trabajoPreview.servicios_detalle && trabajoPreview.servicios_detalle.length > 0 ? (
                        trabajoPreview.servicios_detalle.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-neutral-300 border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                            <span>{s.descripcion}</span>
                            <span className="font-mono font-bold text-neutral-100">Bs. {s.costo.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-300 leading-relaxed">{trabajoPreview.servicios || "Revisión e Inspección Técnica General"}</p>
                      )}
                    </div>
                  </div>

                  {/* Repuestos Montados */}
                  {trabajoPreview.repuestos && trabajoPreview.repuestos.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-purple-300 uppercase text-[11px] flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-purple-400" />
                        <span>Repuestos e Insumos Montados ({trabajoPreview.repuestos.length})</span>
                      </h4>
                      <div className="bg-neutral-950 p-3 rounded-xl border border-white/5 space-y-2">
                        {trabajoPreview.repuestos.map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between text-neutral-300 border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                            <div>
                              <span className="font-mono text-purple-400 font-bold mr-2">[{r.codigo}]</span>
                              <span>{r.nombre}</span>
                              <span className="text-neutral-500 text-[10px] ml-2">x{r.cantidad}u</span>
                            </div>
                            <span className="font-mono font-bold text-purple-300">Bs. {(r.subtotal || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observaciones y Diagnóstico */}
                  <div className="bg-neutral-950/50 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Observaciones / Síntomas</span>
                    <p className="text-neutral-300 italic">{trabajoPreview.observaciones || "Sin observaciones específicas."}</p>
                  </div>

                  {/* Total Final */}
                  <div className="flex items-center justify-between bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20">
                    <span className="font-bold text-emerald-300 text-xs">Total General OT Estimado</span>
                    <span className="font-mono font-black text-emerald-400 text-lg">
                      {currencyFormatter.format(trabajoPreview.costo_total || 650)}
                    </span>
                  </div>
                </div>

                <DialogFooter className="gap-2 border-t border-white/10 pt-3 flex flex-wrap items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) return;
                      const codigoOT = trabajoPreview.codigo_ot || `OT-${String(trabajoPreview.id).substring(0, 4).toUpperCase()}`;
                      const clienteNombre = trabajoPreview.cliente || "Cliente General";
                      const clienteTel = trabajoPreview.cliente_telefono || "70000000";
                      const vehiculoStr = trabajoPreview.vehiculo || "Auto Registrado";
                      const placaStr = trabajoPreview.placa && trabajoPreview.placa !== "SIN PLACA" ? trabajoPreview.placa : "4829-KLS";
                      const fechaStr = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
                      const mecanicoStr = trabajoPreview.mecanico || "Asignado por Taller";

                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Ticket de Recepción - ${codigoOT}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; color: #111; max-width: 600px; margin: 0 auto; }
                              .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-bottom: 15px; }
                              .logo { font-size: 24px; font-weight: bold; color: #dc2626; text-transform: uppercase; }
                              .title { font-size: 16px; font-weight: bold; margin-top: 5px; }
                              .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-family: monospace; }
                              .box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
                              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                              .label { font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; }
                              .val { font-size: 13px; font-weight: bold; }
                              .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 12px; }
                              .sig-line { border-top: 1px solid #333; width: 45%; padding-top: 4px; }
                              @media print { body { padding: 0; } }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="logo">🏁 ADN MOTORS</div>
                              <div>Taller de Mecánica Automotriz & Diagnóstico Electrónico</div>
                              <div class="title">TICKET DE RECEPCIÓN DE VEHÍCULO</div>
                              <div style="margin-top:5px;"><span class="badge">${codigoOT}</span></div>
                            </div>

                            <div class="box">
                              <div class="grid">
                                <div>
                                  <div class="label">Fecha de Ingreso</div>
                                  <div class="val">${fechaStr}</div>
                                </div>
                                <div>
                                  <div class="label">Mecánico Encargado</div>
                                  <div class="val">${mecanicoStr}</div>
                                </div>
                              </div>
                            </div>

                            <div class="box">
                              <div class="grid">
                                <div>
                                  <div class="label">Cliente</div>
                                  <div class="val">${clienteNombre}</div>
                                  <div style="font-size:12px; color:#555;">TEL: ${clienteTel}</div>
                                </div>
                                <div>
                                  <div class="label">Vehículo & Placa</div>
                                  <div class="val">${vehiculoStr}</div>
                                  <div class="val" style="color:#dc2626; font-family:monospace;">PLACA: ${placaStr}</div>
                                </div>
                              </div>
                            </div>

                            <div class="box">
                              <div class="label">Servicios & Diagnóstico Inicial Requerido</div>
                              <div class="val" style="margin-top:4px;">${trabajoPreview.servicios || "Inspección y Revisión General de Taller"}</div>
                            </div>

                            <div class="box" style="font-size:11px; color:#555; background:#f9f9f9;">
                              <strong>Términos de Recepción:</strong> El cliente autoriza la inspección técnica y pruebas de ruta necesarias para el diagnóstico. El taller no se responsabiliza por objetos de valor no declarados en el inventario de ingreso.
                            </div>

                            <div class="signatures">
                              <div class="sig-line">
                                Firma del Cliente
                              </div>
                              <div class="sig-line">
                                Firma Recepción ADN MOTORS
                              </div>
                            </div>

                            <script>
                              window.onload = function() { window.print(); }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                  >
                    🖨️ Ticket Recepción
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTrabajoWhatsApp(trabajoPreview);
                        setModalWhatsAppOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:text-white hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Notificar WhatsApp
                    </button>
                    <ButtonDS variant="secondary" onClick={() => setModalPreviewOpen(false)}>
                      Cerrar Preview
                    </ButtonDS>
                    <ButtonDS
                      variant="primary"
                      onClick={() => {
                        setModalPreviewOpen(false);
                        setTrabajoSeleccionado(trabajoPreview);
                        setDrawerOpen(true);
                      }}
                    >
                      Abrir Ficha Completa →
                    </ButtonDS>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Cobro QR Bolivia */}
        <ModalCobroQR
          isOpen={modalCobroOpen}
          onClose={() => setModalCobroOpen(false)}
          trabajo={trabajoCobroSelected}
          onCobroExitoso={(facturaId) => {
            refetch();
            navigate(`/factura/${facturaId}`);
          }}
        />

        {/* Modal Notificaciones Directas WhatsApp */}
        <ModalWhatsAppNotificacion
          isOpen={modalWhatsAppOpen}
          onClose={() => setModalWhatsAppOpen(false)}
          trabajo={trabajoWhatsApp}
        />
      </main>
    </div>
  );
};