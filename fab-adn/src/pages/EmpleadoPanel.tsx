import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser, getPermisos } from "@/lib/auth";
import {
  obtenerCitasEmpleado,
  obtenerCitasAdmin,
  cambiarEstadoCitaEmpleado,
  type Trabajo,
} from "@/api/citaApi";
import { Navbar } from "@/components/ui/Navbar";
import { SectionHeader } from "@/components/ui/DesignSystem";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { EmptyState } from "@/components/ui/EmptyState";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Search, RefreshCw, Car, CheckCircle2, Clock, Shield, AlertCircle
} from "lucide-react";

import { EmpleadoKpis } from "@/features/empleado/EmpleadoKpis";
import { TabsEstados } from "@/features/empleado/TabsEstados";
import { TrabajoCard } from "@/features/empleado/TrabajoCard";
import {
  type EstadoTrabajoType,
  validarTransicionEstado,
  getCodigoOT,
} from "@/features/empleado/stateMachine";

// Lazy loading del Drawer lateral de Trabajo
const TrabajoDrawer = lazy(() =>
  import("@/features/empleado/TrabajoDrawer").then((module) => ({
    default: module.TrabajoDrawer,
  }))
);

import { CrearTrabajoModal } from "@/components/CrearTrabajoModal";
import { Plus } from "lucide-react";

const EmpleadoPanel: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cambiandoId, setCambiandoId] = useState<string | number | null>(null);

  // Filtro de Tabs y Búsqueda
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Drawer Lateral Estado y Modal de Trabajo
  const [selectedTrabajo, setSelectedTrabajo] = useState<Trabajo | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);

  const token = localStorage.getItem("token") || "";
  const user = getUser();
  const permisos = getPermisos();
  const rolNombre = user?.rol_nombre || user?.rol || "Empleado";

  const puedeVerCitas = permisos.includes("Ver citas");
  const puedeCambiarEstado =
    permisos.includes("Cambiar estado de trabajo") ||
    permisos.includes("Gestionar trabajos") ||
    user?.rol === "admin" ||
    user?.rol === "empleado";

  const esMecanico = user?.rol === "empleado" && !puedeVerCitas;
  const verTodas = (puedeVerCitas || user?.rol === "admin") && !esMecanico;

  // Debounce de búsqueda de 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const cargarTrabajos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: Trabajo[];
      if (verTodas) {
        data = await obtenerCitasAdmin(token);
      } else {
        data = await obtenerCitasEmpleado(token);
      }
      setTrabajos(data);
    } catch (err: any) {
      console.error("Error al cargar trabajos:", err);
      setError("No se pudieron cargar las órdenes de trabajo.");
    } finally {
      setLoading(false);
    }
  }, [token, verTodas]);

  useEffect(() => {
    cargarTrabajos();
  }, [cargarTrabajos]);

  // Contadores por estado para las Tabs
  const contadores = useMemo(() => {
    const counts: Record<string, number> = {
      Todos: trabajos.length,
      Agendado: 0,
      "En taller": 0,
      "En progreso": 0,
      "En revisión": 0,
      Completado: 0,
      Entregado: 0,
    };

    trabajos.forEach((t) => {
      const est = t.estado || "Agendado";
      if (counts[est] !== undefined) {
        counts[est] += 1;
      }
    });

    return counts;
  }, [trabajos]);

  // Filtrado y búsqueda memorizada
  const trabajosFiltrados = useMemo(() => {
    return trabajos.filter((t) => {
      const estadoMatch =
        filtroEstado === "Todos" ? true : (t.estado || "Agendado") === filtroEstado;

      if (!estadoMatch) return false;
      if (!debouncedSearch) return true;

      const clienteName = (t.cliente?.usuario?.nombreCompleto || t.cliente?.nombre || "").toLowerCase();
      const codigoOtStr = getCodigoOT(t.id).toLowerCase();
      const obs = (t.observaciones || "").toLowerCase();

      return (
        clienteName.includes(debouncedSearch) ||
        codigoOtStr.includes(debouncedSearch) ||
        obs.includes(debouncedSearch)
      );
    });
  }, [trabajos, filtroEstado, debouncedSearch]);

  // Manejador del cambio de estado según la Máquina de Estados
  const handleCambiarEstado = useCallback(
    async (trabajo: Trabajo, nuevoEstado: EstadoTrabajoType, nota?: string) => {
      const estadoActual = (trabajo.estado || "Agendado") as EstadoTrabajoType;
      const validacion = validarTransicionEstado(estadoActual, nuevoEstado, nota);

      if (!validacion.esValido) {
        toast({
          title: "Transición no permitida",
          description: validacion.error || "Operación no autorizada",
          variant: "destructive",
        });
        return;
      }

      if (!puedeCambiarEstado) {
        toast({
          title: "Sin Permisos",
          description: "Tu rol no tiene permiso para cambiar el estado de este trabajo.",
          variant: "destructive",
        });
        return;
      }

      setCambiandoId(trabajo.id);
      try {
        // Optimistic Update en UI
        setTrabajos((prev) =>
          prev.map((t) => (t.id === trabajo.id ? { ...t, estado: nuevoEstado } : t))
        );

        await cambiarEstadoCitaEmpleado(token, trabajo.id, nuevoEstado);

        toast({
          title: "¡Estado Actualizado!",
          description: `${getCodigoOT(trabajo.id)} pasó de "${estadoActual}" a "${nuevoEstado}".`,
        });
      } catch (err: any) {
        // Rollback en caso de error
        setTrabajos((prev) =>
          prev.map((t) => (t.id === trabajo.id ? { ...t, estado: estadoActual } : t))
        );

        toast({
          title: "Error al actualizar estado",
          description: err.response?.data?.error || err.message || "No se pudo completar el cambio",
          variant: "destructive",
        });
      } finally {
        setCambiandoId(null);
      }
    },
    [token, puedeCambiarEstado, toast]
  );

  const handleOpenDetail = useCallback((trabajo: Trabajo) => {
    setSelectedTrabajo(trabajo);
    setIsDrawerOpen(true);
  }, []);

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-16`}>
      {/* ── SHARED NAVBAR ── */}
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* ── HEADER Y TITULO DE SECCIÓN ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <Wrench className="h-7 w-7 text-red-500" />
              <span>Panel Operativo de Taller</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Monitoreo de Órdenes de Trabajo (OT) con máquina de estados estricta y auditoría.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setIsCrearModalOpen(true)}
            >
              Registrar Entrada OT
            </ButtonDS>
            <ButtonDS variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={cargarTrabajos}>
              Actualizar Lista
            </ButtonDS>
          </div>
        </div>

        {/* ── KPIS OPERATIVOS ── */}
        <EmpleadoKpis trabajos={trabajos} />

        {/* ── BARRA DE BÚSQUEDA Y FILTROS TABS ── */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input con icono */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por cliente, vehículo o código OT (ej: OT-B4E5)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Tabs por Estado */}
          <TabsEstados
            filtroActual={filtroEstado}
            onSelectFiltro={setFiltroEstado}
            contadores={contadores}
          />
        </div>

        {/* ── GRID DE TRABAJOS O ESTADOS VACÍOS ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-neutral-900 border border-white/5 animate-pulse p-5 space-y-4" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="h-8 w-8 text-red-500" />}
            title="Error al cargar las órdenes de trabajo"
            description={error}
            actionText="Reintentar Carga"
            onAction={cargarTrabajos}
          />
        ) : trabajosFiltrados.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-8 w-8 text-neutral-600" />}
            title={filtroEstado === "Todos" ? "No hay órdenes de trabajo asignadas" : `Sin órdenes en estado "${filtroEstado}"`}
            description="No se encontraron coincidencias para los filtros o la búsqueda seleccionada."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {trabajosFiltrados.map((trabajo) => (
              <TrabajoCard
                key={trabajo.id}
                trabajo={trabajo}
                onCambiarEstado={handleCambiarEstado}
                onOpenDetail={handleOpenDetail}
                isCambiando={cambiandoId === trabajo.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── DRAWER LATERAL LAZY LOADED ── */}
      <Suspense fallback={null}>
        {isDrawerOpen && selectedTrabajo && (
          <TrabajoDrawer
            trabajo={selectedTrabajo}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onCambiarEstado={handleCambiarEstado}
          />
        )}
      </Suspense>

      {/* ── MODAL CREAR NUEVA ORDEN DE TRABAJO (OT) ── */}
      <CrearTrabajoModal
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
        onTrabajoCreado={cargarTrabajos}
      />
    </div>
  );
};

export default EmpleadoPanel;