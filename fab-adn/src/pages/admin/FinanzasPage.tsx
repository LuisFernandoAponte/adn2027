import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Search, Filter, Calendar,
  AlertCircle, CheckCircle2, Trash2, FileText, Lightbulb, Droplets,
  Wifi, Home, Users, Wrench, Receipt, RefreshCw, Loader2, ArrowUpRight,
  PieChart, Building2, ShieldCheck, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CardDS } from "@/components/ui/DesignSystem";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { useToast } from "@/hooks/use-toast";
import { currencyFormatter } from "@/features/empleado/stateMachine";

interface EgresoItem {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
  metodo_pago?: string;
  referencia_comprobante?: string;
  empleado?: {
    id: string;
    nombre: string;
    cargo: string;
  } | null;
  registrado_por: string;
  observaciones?: string;
}

interface ResumenFinanciero {
  periodo: {
    mes: number;
    anio: number;
    nombre_mes: string;
  };
  metricas: {
    ingresos_totales: number;
    egresos_totales: number;
    utilidad_neta: number;
    margen_ganancia_porcentaje: number;
    comparativa_mes_anterior: {
      ingresos_ant: number;
      egresos_ant: number;
      utilidad_ant: number;
      crecimiento_ingresos_pct: number;
      variacion_egresos_pct: number;
    };
  };
  desglose_categorias: Array<{
    categoria: string;
    label: string;
    total: number;
    count: number;
    porcentaje: number;
  }>;
}

interface EmpleadoSimple {
  empleado_id: string;
  nombre_completo: string;
  cargo: string;
}

const CATEGORIAS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  servicios_basicos: {
    label: "Servicios Básicos (Luz, Agua, Net)",
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20"
  },
  sueldos_salarios: {
    label: "Sueldos y Adelantos a Personal",
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20"
  },
  alquiler: {
    label: "Alquiler del Taller / Galpón",
    icon: Home,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20"
  },
  repuestos_insumos: {
    label: "Insumos, Aceites y Repuestos",
    icon: Wrench,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20"
  },
  mantenimiento_taller: {
    label: "Mantenimiento Equipos / Taller",
    icon: Building2,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20"
  },
  impuestos_legales: {
    label: "Impuestos, Patentes y Contabilidad",
    icon: FileText,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20"
  },
  otros: {
    label: "Otros Gastos / Caja Chica",
    icon: Receipt,
    color: "text-neutral-400",
    bg: "bg-neutral-500/10 border-neutral-500/20"
  }
};

export const FinanzasPage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [egresos, setEgresos] = useState<EgresoItem[]>([]);
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoSimple[]>([]);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const now = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(now.getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(now.getFullYear());

  // Modal Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: "",
    categoria: "servicios_basicos",
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
    metodo_pago: "efectivo",
    referencia_comprobante: "",
    empleado_id: "",
    observaciones: ""
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resumenRes, egresosRes, empRes] = await Promise.all([
        axios.get(`/api/egresos/resumen?mes=${mesSeleccionado}&anio=${anioSeleccionado}`, { headers }),
        axios.get(`/api/egresos?mes=${mesSeleccionado}&anio=${anioSeleccionado}&limit=100`, { headers }),
        axios.get("/api/cliente/empleados-disponibles", { headers }).catch(() => ({ data: { empleados: [] } }))
      ]);

      if (resumenRes.data.success) {
        setResumen(resumenRes.data);
      }
      if (egresosRes.data.success) {
        setEgresos(egresosRes.data.egresos || []);
      }
      setEmpleados(empRes.data.empleados || []);
    } catch (err: any) {
      console.error("Error al cargar finanzas:", err);
      toast({
        title: "Error al cargar datos financieros",
        description: err.response?.data?.error || "Verifica tu conexión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [mesSeleccionado, anioSeleccionado]);

  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim() || !formData.monto) {
      toast({ title: "Campos incompletos", description: "Indica descripción y monto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/egresos", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast({ title: "Gasto registrado", description: "El egreso se guardó correctamente" });
        setIsModalOpen(false);
        setFormData({
          descripcion: "",
          categoria: "servicios_basicos",
          monto: "",
          fecha: new Date().toISOString().split("T")[0],
          metodo_pago: "efectivo",
          referencia_comprobante: "",
          empleado_id: "",
          observaciones: ""
        });
        cargarDatos();
      }
    } catch (err: any) {
      toast({
        title: "Error al registrar gasto",
        description: err.response?.data?.error || "Intenta nuevamente",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarEgreso = async (id: string, desc: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro: "${desc}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/egresos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "Registro eliminado", description: "El gasto fue borrado del sistema" });
      cargarDatos();
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: err.response?.data?.error || "No se pudo eliminar",
        variant: "destructive"
      });
    }
  };

  // Filtrado de lista en tiempo real
  const egresosFiltrados = useMemo(() => {
    return egresos.filter(e => {
      const matchCat = filtroCategoria === "todas" || e.categoria === filtroCategoria;
      const q = busqueda.toLowerCase().trim();
      const matchSearch = !q ||
        e.descripcion.toLowerCase().includes(q) ||
        (e.referencia_comprobante && e.referencia_comprobante.toLowerCase().includes(q)) ||
        (e.empleado && e.empleado.nombre.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [egresos, filtroCategoria, busqueda]);

  const metricas = resumen?.metricas;
  const esGanancia = (metricas?.utilidad_neta || 0) >= 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* 1. ENCABEZADO Y ACCIONES */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight">
                Control Financiero & Egresos
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Balance de caja real: Ingresos cobrados vs Gastos fijos (Luz, agua, internet, sueldos, alquiler)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Mes */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 p-1.5 rounded-xl text-xs">
            <Calendar className="h-4 w-4 text-neutral-400 ml-1.5" />
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
              className="bg-transparent text-neutral-200 text-xs font-semibold px-2 py-1 focus:outline-none cursor-pointer"
            >
              {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, idx) => (
                <option key={idx} value={idx + 1} className="bg-neutral-900">{m}</option>
              ))}
            </select>
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
              className="bg-transparent text-neutral-200 text-xs font-semibold px-2 py-1 focus:outline-none cursor-pointer border-l border-white/10"
            >
              {[2025, 2026, 2027].map(a => (
                <option key={a} value={a} className="bg-neutral-900">{a}</option>
              ))}
            </select>
          </div>

          <ButtonDS
            variant="secondary"
            isLoading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={cargarDatos}
            className="text-xs py-2"
          >
            Actualizar
          </ButtonDS>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar Gasto / Pago</span>
          </button>
        </div>
      </div>

      {/* 2. KPIS FINANCIEROS CLAVE (BALANCE GENERAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ingresos Totales */}
        <CardDS className="p-5 flex flex-col justify-between border border-white/5 space-y-2 bg-gradient-to-br from-neutral-900/90 to-neutral-900/40">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-bold uppercase tracking-wider">Ingresos Facturados</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {currencyFormatter.format(metricas?.ingresos_totales || 0)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
              <span>Período {resumen?.periodo?.nombre_mes || 'actual'}</span>
            </p>
          </div>
        </CardDS>

        {/* Egresos Totales */}
        <CardDS className="p-5 flex flex-col justify-between border border-white/5 space-y-2 bg-gradient-to-br from-neutral-900/90 to-neutral-900/40">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-bold uppercase tracking-wider">Gastos Operativos (Egresos)</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">
              {currencyFormatter.format(metricas?.egresos_totales || 0)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {egresos.length} gastos registrados este mes
            </p>
          </div>
        </CardDS>

        {/* Utilidad Neta Real */}
        <CardDS className={`p-5 flex flex-col justify-between border space-y-2 ${
          esGanancia ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-red-500/30 bg-red-950/10'
        }`}>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-bold uppercase tracking-wider">Ganancia Neta Real (Caja)</span>
            <div className={`p-2 rounded-xl border ${esGanancia ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${esGanancia ? 'text-emerald-300' : 'text-red-400'}`}>
              {currencyFormatter.format(metricas?.utilidad_neta || 0)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                esGanancia ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}>
                {esGanancia ? 'SUPERÁVIT' : 'DÉFICIT'}
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                Margen: <strong>{metricas?.margen_ganancia_porcentaje || 0}%</strong>
              </span>
            </div>
          </div>
        </CardDS>

        {/* Eficiencia Financiera */}
        <CardDS className="p-5 flex flex-col justify-between border border-white/5 space-y-2 bg-gradient-to-br from-neutral-900/90 to-neutral-900/40">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-bold uppercase tracking-wider">Razón de Cobertura</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-neutral-100 font-mono">
              {metricas && metricas.egresos_totales > 0
                ? (metricas.ingresos_totales / metricas.egresos_totales).toFixed(2)
                : '1.00'}x
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Por cada $1 que gastas ingresan ${(metricas && metricas.egresos_totales > 0 ? (metricas.ingresos_totales / metricas.egresos_totales).toFixed(2) : '1.00')}
            </p>
          </div>
        </CardDS>
      </div>

      {/* 3. DESGLOSE DE GASTOS POR CATEGORÍA */}
      <div className="p-6 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-bold text-neutral-100">Distribución de Gastos Operativos</h2>
          </div>
          <span className="text-xs text-neutral-400">
            Total gastado este mes: <strong className="text-neutral-100 font-mono">{currencyFormatter.format(metricas?.egresos_totales || 0)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {resumen?.desglose_categorias.map(item => {
            const cfg = CATEGORIAS_CONFIG[item.categoria] || CATEGORIAS_CONFIG.otros;
            const Icon = cfg.icon;
            return (
              <div
                key={item.categoria}
                onClick={() => setFiltroCategoria(filtroCategoria === item.categoria ? "todas" : item.categoria)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  filtroCategoria === item.categoria
                    ? 'border-red-500 bg-red-500/10 shadow-md ring-1 ring-red-500'
                    : 'border-white/5 bg-neutral-950/60 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">{cfg.label}</h4>
                      <span className="text-[10px] text-neutral-400">{item.count} comprobante{item.count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono text-neutral-100">
                    {item.porcentaje}%
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-neutral-100 text-sm">
                    {currencyFormatter.format(item.total)}
                  </span>
                </div>

                {/* Barra de progreso visual */}
                <div className="mt-2 w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${Math.min(item.porcentaje, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. TABLA DETALLADA DE EGRESOS CON FILTROS */}
      <div className="p-6 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-100">Historial Detallado de Gastos</h3>
            <p className="text-xs text-neutral-400">Auditoría completa de cada pago realizado con fecha, comprobante y beneficiario</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Buscador */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por descripción, recibo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Selector de Categoría */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs font-semibold text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas las categorías</option>
              {Object.entries(CATEGORIAS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 uppercase text-[10px] text-neutral-400 font-bold border-b border-white/10">
              <tr>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Descripción / Concepto</th>
                <th className="p-3.5">Comprobante</th>
                <th className="p-3.5">Beneficiario / Empleado</th>
                <th className="p-3.5">Método</th>
                <th className="p-3.5 text-right">Monto</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {egresosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500 text-xs">
                    No se encontraron gastos registrados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                egresosFiltrados.map(e => {
                  const cfg = CATEGORIAS_CONFIG[e.categoria] || CATEGORIAS_CONFIG.otros;
                  const Icon = cfg.icon;
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono text-neutral-400 whitespace-nowrap">
                        {e.fecha}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          <span>{cfg.label.split('(')[0].trim()}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-neutral-200 min-w-[200px]">
                        <div>{e.descripcion}</div>
                        {e.observaciones && (
                          <div className="text-[10px] text-neutral-400 mt-0.5">{e.observaciones}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-neutral-400 whitespace-nowrap">
                        {e.referencia_comprobante ? (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-white/5 text-neutral-300">
                            {e.referencia_comprobante}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {e.empleado ? (
                          <span className="font-semibold text-neutral-300 flex items-center gap-1">
                            <Users className="h-3 w-3 text-blue-400" />
                            {e.empleado.nombre}
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">{e.registrado_por}</span>
                        )}
                      </td>
                      <td className="p-3.5 capitalize text-neutral-400 whitespace-nowrap">
                        {e.metodo_pago || 'efectivo'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-red-400 text-sm whitespace-nowrap">
                        -{currencyFormatter.format(e.monto)}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleEliminarEgreso(e.id, e.descripcion)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL PARA REGISTRAR GASTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-100">Registrar Nuevo Gasto / Egreso</h3>
                    <p className="text-[11px] text-neutral-400">Ingresa la salida de dinero para mantener las cuentas al día</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCrearEgreso} className="space-y-4">
                {/* Categoría */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Categoría del Gasto *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
                    required
                  >
                    {Object.entries(CATEGORIAS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Descripción / Concepto *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago Factura Luz CRE Galpón, Internet Tigo, Adelanto..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Monto */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Monto ($ o Bs) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 font-mono font-bold focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Fecha del Pago *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full p-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Método de Pago */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Forma de Pago
                    </label>
                    <select
                      value={formData.metodo_pago}
                      onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="QR">Código QR</option>
                    </select>
                  </div>

                  {/* Comprobante / Recibo */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Nro. Factura / Recibo (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: FACT-1092 / REC-44"
                      value={formData.referencia_comprobante}
                      onChange={(e) => setFormData({ ...formData, referencia_comprobante: e.target.value })}
                      className="w-full p-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>

                {/* Si es Sueldos, permitir seleccionar a qué empleado */}
                {formData.categoria === "sueldos_salarios" && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Empleado o Mecánico Destinatario
                    </label>
                    <select
                      value={formData.empleado_id}
                      onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Pago general o no especificado --</option>
                      {empleados.map(emp => (
                        <option key={emp.empleado_id} value={emp.empleado_id}>
                          {emp.nombre_completo} ({emp.cargo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Notas adicionales / Observaciones (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre el pago..."
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-neutral-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>Guardar Egreso</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanzasPage;
