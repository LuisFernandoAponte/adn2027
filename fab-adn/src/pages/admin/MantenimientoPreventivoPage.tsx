import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, ShieldAlert, AlertTriangle, CheckCircle2, Search, RefreshCw,
  MessageCircle, Plus, Calendar, Car, Phone, ArrowUpRight, Sparkles, Filter
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { StatCard, CardDS } from "@/components/ui/DesignSystem";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { useToast } from "@/hooks/use-toast";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import {
  obtenerMantenimientosPreventivos,
  type MantenimientoPreventivoItem,
  type MantenimientoPreventivoResponse
} from "@/api/vehiculoApi";
import { ModalWhatsAppNotificacion } from "@/components/admin/ModalWhatsAppNotificacion";

export const MantenimientoPreventivoPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MantenimientoPreventivoResponse | null>(null);
  const [filtroUrgencia, setFiltroUrgencia] = useState<"TODOS" | "VENCIDO" | "PROXIMO" | "AL_DIA">("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Modal WhatsApp
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState<boolean>(false);
  const [whatsAppProps, setWhatsAppProps] = useState<any>({});

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await obtenerMantenimientosPreventivos();
      setData(res);
    } catch (error: any) {
      console.error("Error al cargar mantenimientos preventivos:", error);
      toast({
        title: "Error al Cargar Mantenimientos",
        description: error.response?.data?.error || "No se pudo obtener el programa de retención.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Filtrado
  const itemsFiltrados = useMemo(() => {
    if (!data?.vehiculos) return [];
    return data.vehiculos.filter((item) => {
      const matchUrgencia = filtroUrgencia === "TODOS" ? true : item.urgencia === filtroUrgencia;
      if (!matchUrgencia) return false;

      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        item.placa.toLowerCase().includes(q) ||
        item.cliente.toLowerCase().includes(q) ||
        item.vehiculo.toLowerCase().includes(q) ||
        item.servicio_recomendado.toLowerCase().includes(q)
      );
    });
  }, [data, filtroUrgencia, busqueda]);

  const handleOpenWhatsAppRecordatorio = (item: MantenimientoPreventivoItem) => {
    setWhatsAppProps({
      clienteNombre: item.cliente,
      clienteTelefono: item.telefono,
      vehiculo: item.vehiculo,
      placa: item.placa,
      codigoOT: "PREV",
      total: 350,
      servicio: item.servicio_recomendado,
      templateDefault: "preventivo",
    });
    setModalWhatsAppOpen(true);
  };

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-24`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <Clock className="h-7 w-7 text-amber-500" />
              <span>Mantenimiento Preventivo & Retención de Clientes</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Monitoreo predictivo de intervalos de kilometraje y tiempo para generar ingresos recurrentes en taller.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={cargarDatos}
              disabled={loading}
            >
              Actualizar
            </ButtonDS>
          </div>
        </div>

        {/* 4 KPIS DE FLOTA Y RETENCIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6">
          <StatCard
            title="Vehículos Monitoreados"
            value={data?.metricas?.total_vehiculos_monitoreados || 0}
            subtitle="Clientes con historial en taller"
            icon={<Car className="h-6 w-6" />}
            variant="blue"
          />

          <StatCard
            title="Vencidos Urgentes"
            value={data?.metricas?.vencidos_urgentes || 0}
            subtitle="Más de 90 días o km excedido"
            icon={<ShieldAlert className="h-6 w-6" />}
            variant="red"
          />

          <StatCard
            title="Próximos Este Mes"
            value={data?.metricas?.proximos_este_mes || 0}
            subtitle="Intervalo de 60 a 90 días"
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="amber"
          />

          <StatCard
            title="Al Día"
            value={data?.metricas?.al_dia || 0}
            subtitle="Menos de 60 días desde su service"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="emerald"
          />
        </div>

        {/* BANNER DE ESTRATEGIA DE RETENCIÓN */}
        <div className="mt-6 p-4 rounded-3xl bg-neutral-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                Estrategia Comercial de Ocupación del Taller
              </h3>
              <p className="text-[11px] text-neutral-400">
                Contacta a los clientes marcados como <strong className="text-red-400 font-bold">"Vencidos"</strong> los lunes a primera hora para llenar tus bahías de trabajo durante la semana.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-neutral-300 bg-neutral-950 px-4 py-2 rounded-xl border border-white/5">
            Oportunidad estimada: <strong className="text-emerald-400 font-bold">Bs. {((data?.metricas?.vencidos_urgentes || 0) * 350).toLocaleString()}</strong>
          </div>
        </div>

        {/* FILTROS Y BUSCADOR */}
        <div className="mt-6 p-4 rounded-3xl bg-neutral-900/80 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
          {/* Tabs de Filtro */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-white/5 text-xs font-semibold overflow-x-auto">
            {[
              { id: "TODOS", label: "Todos", count: data?.vehiculos?.length || 0 },
              { id: "VENCIDO", label: "🔴 Vencidos", count: data?.metricas?.vencidos_urgentes || 0 },
              { id: "PROXIMO", label: "🟡 Próximos Este Mes", count: data?.metricas?.proximos_este_mes || 0 },
              { id: "AL_DIA", label: "🟢 Al Día", count: data?.metricas?.al_dia || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFiltroUrgencia(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filtroUrgencia === tab.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-900 text-neutral-400">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por placa, cliente o vehículo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* LISTADO DE VEHÍCULOS / PROGRAMA PREVENTIVO */}
        {loading ? (
          <div className="pt-12 text-center text-xs text-neutral-400 animate-pulse flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
            Calculando intervalos de mantenimiento de la flota...
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="mt-6 p-12 text-center rounded-3xl bg-neutral-900 border border-white/5 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-400">No hay vehículos en este filtro</p>
            <p className="text-xs text-neutral-500">Prueba cambiando de pestaña o limpiando la búsqueda.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {itemsFiltrados.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-neutral-900/90 border border-white/5 hover:border-amber-500/40 transition-all shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Vehículo & Placa */}
                <div className="flex items-center gap-4 min-w-[280px]">
                  <button
                    onClick={() => navigate(`/admin/historial-vehiculo?placa=${item.placa}`)}
                    className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 font-mono text-base font-black tracking-wider hover:scale-105 transition-transform"
                    title="Ver Historial Clínico Completo"
                  >
                    {item.placa}
                  </button>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                      <span>{item.vehiculo}</span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Propietario: <strong className="text-neutral-200">{item.cliente}</strong>
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Km actual: <strong className="text-neutral-300 font-bold">{item.km_actual.toLocaleString()} km</strong>
                    </p>
                  </div>
                </div>

                {/* Servicio Recomendado & Intervalo */}
                <div className="space-y-1 text-xs flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Servicio Preventivo Sugerido:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.urgencia === "VENCIDO"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                        : item.urgencia === "PROXIMO"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      {item.urgencia_label}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-amber-400" />
                    <span>{item.servicio_recomendado}</span>
                  </p>

                  <p className="text-[11px] text-neutral-400">
                    Último service hace <strong className="text-neutral-200 font-mono">{item.dias_desde_ultimo_servicio} días</strong> ({item.ultimo_servicio_nombre}) · Próximo a los <strong className="text-amber-400 font-mono">{item.km_siguiente.toLocaleString()} km</strong>
                  </p>
                </div>

                {/* Botones de Acción Rápida */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                  <button
                    onClick={() => navigate(`/admin/historial-vehiculo?placa=${item.placa}`)}
                    className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-neutral-300 text-xs font-semibold transition-all flex items-center gap-1"
                    title="Ver Carfax del Vehículo"
                  >
                    <span>Ficha Carfax</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenWhatsAppRecordatorio(item)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Enviar Recordatorio por WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Recordar por WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE WHATSAPP RECORDATORIO */}
      <ModalWhatsAppNotificacion
        open={modalWhatsAppOpen}
        onClose={() => setModalWhatsAppOpen(false)}
        {...whatsAppProps}
      />
    </div>
  );
};

export default MantenimientoPreventivoPage;
