import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerMisCitas, type Trabajo } from "@/api/citaApi";
import { AutoTrackerTesla } from "@/components/AutoTrackerTesla";
import { Navbar } from "@/components/ui/Navbar";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { CardDS, StatCard } from "@/components/ui/DesignSystem";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Car,
  Loader2,
  ClipboardList,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Search,
  Activity,
  AlertCircle
} from "lucide-react";

export const MisCitas: React.FC = () => {
  const navigate = useNavigate();
  const [citas, setCitas] = useState<Trabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const cargar = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerMisCitas();
      setCitas(data);
    } catch (err: any) {
      console.error("Error al cargar citas de cliente:", err);
      setError("No se pudieron cargar tus citas vehiculares.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const matchEstado =
        filtroEstado === "Todos"
          ? true
          : filtroEstado === "Activos"
          ? !["Entregado", "Cancelado"].includes(c.estado)
          : filtroEstado === "Completados"
          ? ["Completado", "Entregado"].includes(c.estado)
          : c.estado === filtroEstado;

      if (!matchEstado) return false;
      if (!searchTerm) return true;

      const q = searchTerm.toLowerCase();
      const vehiculoStr = (c.vehiculo || "").toLowerCase();
      const placaStr = (c.placa || "").toLowerCase();
      const mecanicoStr = (c.mecanico || "").toLowerCase();
      const idStr = String(c.id).toLowerCase();

      return (
        vehiculoStr.includes(q) ||
        placaStr.includes(q) ||
        mecanicoStr.includes(q) ||
        idStr.includes(q)
      );
    });
  }, [citas, filtroEstado, searchTerm]);

  const activasCount = citas.filter((c) => !["Entregado", "Cancelado"].includes(c.estado)).length;
  const completadasCount = citas.filter((c) => ["Completado", "Entregado"].includes(c.estado)).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-16">
      {/* ── SHARED NAVBAR ── */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── HEADER DE SECCIÓN ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ButtonDS
                variant="ghost"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => navigate("/cliente/home")}
                className="text-xs py-1 px-2.5"
              >
                Volver
              </ButtonDS>
              <BadgeDS variant="vip">Telemetría de Vehículo</BadgeDS>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Car className="h-7 w-7 text-red-500" />
              <span>Seguimiento y Trazabilidad de mi Auto</span>
            </h1>
            <p className="text-xs text-neutral-400">
              Monitoreo interactivo estilo Tesla: avances en tiempo real, diagnóstico técnico y estado de piezas.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ButtonDS
              variant="secondary"
              icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-500" : ""}`} />}
              onClick={cargar}
              className="text-xs py-2 px-3.5 flex-1 sm:flex-initial"
            >
              Actualizar Telemetría
            </ButtonDS>
            <ButtonDS
              variant="primary"
              onClick={() => navigate("/cliente/home")}
              className="text-xs py-2 px-3.5 flex-1 sm:flex-initial"
            >
              + Nueva Cita
            </ButtonDS>
          </div>
        </div>

        {/* ── RESUMEN KPI TELEMETRIA ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Visitas Registradas"
            value={citas.length}
            subtitle="Historial completo de mantenimientos"
            icon={<ClipboardList className="h-6 w-6" />}
            variant="purple"
          />
          <StatCard
            title="Vehículos en Taller Activos"
            value={activasCount}
            subtitle={activasCount > 0 ? "Reparación o revisión en vivo" : "Sin autos en taller actualmente"}
            icon={<Wrench className="h-6 w-6" />}
            variant="amber"
          />
          <StatCard
            title="Mantenimientos Completados"
            value={completadasCount}
            subtitle="Con garantía de servicio ADN Motors"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="emerald"
          />
        </div>

        {/* ── BARRA DE BÚSQUEDA Y FILTROS ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por placa, modelo de auto o mecánico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-white/5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {["Todos", "Activos", "Completados"].map((filtro) => (
              <button
                key={filtro}
                onClick={() => setFiltroEstado(filtro)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filtroEstado === filtro
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "bg-neutral-900 text-neutral-400 hover:text-white border border-white/5"
                }`}
              >
                {filtro}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENIDO PRINCIPAL: TRACKER TESLA STYLE ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-red-500" />
            <p className="text-sm font-semibold text-neutral-300">Cargando tus citas...</p>
            <p className="text-xs text-neutral-500">Conectando con la telemetría del taller en vivo</p>
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="h-10 w-10 text-red-500" />}
            title="Error al cargar la información vehicular"
            description={error}
            actionText="Reintentar Conexión"
            onAction={cargar}
          />
        ) : citasFiltradas.length === 0 ? (
          <EmptyState
            icon={<Car className="h-10 w-10 text-neutral-600" />}
            title="No tienes citas registradas"
            description={searchTerm ? "No hay vehículos que coincidan con la búsqueda." : "Agenda tu cita para monitorear el avance de tu auto en vivo."}
            actionText="+ Agendar nueva cita"
            onAction={() => navigate("/cliente/home")}
          />
        ) : (
          <div className="space-y-6">
            {citasFiltradas.map((cita) => (
              <AutoTrackerTesla
                key={cita.id}
                trabajo={cita}
                onRefresh={cargar}
                isRefreshing={loading}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MisCitas;