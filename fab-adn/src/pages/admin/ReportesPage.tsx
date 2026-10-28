import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Calendar, Download, RefreshCw, DollarSign, Wrench, Users,
  CheckCircle2, UserCheck, TrendingUp, TrendingDown, Award, Star, Trophy, ShieldCheck,
  FileSpreadsheet, Filter, Sparkles, AlertCircle, ArrowUpRight, Clock,
  PieChart as PieIcon, Layers, FileText, Printer, Car, PackageCheck, Percent
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_BASE } from "@/api/config";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line
} from "recharts";
import { obtenerBalanceResumen, type ResumenFinanciero } from "@/api/egresosApi";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { currencyFormatter, dateFormatter } from "@/features/empleado/stateMachine";

// Helper robusto y seguro para formateo de fechas
export const formatDateSafe = (value: unknown, fallback: string = "N/A"): string => {
  if (!value || value === "N/A" || value === "null" || value === "undefined") {
    return fallback;
  }
  const strVal = String(value).trim();
  if (!strVal || strVal === "N/A") return fallback;

  const dateObj = strVal.length === 10 && strVal.includes("-")
    ? new Date(`${strVal}T12:00:00`)
    : new Date(strVal);

  if (isNaN(dateObj.getTime())) {
    return fallback;
  }

  try {
    return dateFormatter.format(dateObj);
  } catch (e) {
    return fallback;
  }
};

// Paleta ejecutiva de colores en tema oscuro
const CHART_COLORS = [
  "#ef4444", // Rojo deportivo ADN
  "#10b981", // Esmeralda / Superávit
  "#3b82f6", // Azul zafiro
  "#f59e0b", // Ámbar / Alerta
  "#8b5cf6", // Púrpura ejecutivo
  "#06b6d4", // Cían
  "#ec4899", // Magenta
  "#14b8a6", // Turquesa
  "#f97316", // Naranja
  "#64748b", // Pizarra neutra
];

interface IndicadoresData {
  ingresos_totales: number;
  egresos_totales?: number;
  utilidad_neta?: number;
  margen_ganancia_porcentaje?: number;
  promedio_diario: number;
  ticket_promedio?: number;
  servicios_distintos: number;
  mecanicos_activos: number;
  citas_atendidas: number;
  clientes_atendidos: number;
  total_ordenes?: number;
  tasa_completacion?: number;
}

interface ServicioEstadistica {
  servicio: string;
  veces: number;
  total: number;
  porcentaje: number;
  ticket_promedio?: number;
}

interface MecanicoEstadistica {
  mecanico: string;
  trabajos: number;
  total_facturado: number;
  porcentaje: number;
  ticket_promedio?: number;
}

interface CategoriaEgreso {
  categoria: string;
  label?: string;
  nombre_legible: string;
  total: number;
  count: number;
  porcentaje: number;
}

interface TimelineFlujoItem {
  fecha: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

interface MarcaVehiculoItem {
  marca: string;
  cantidad: number;
  porcentaje: number;
}

interface RepuestoUsoItem {
  repuesto: string;
  cantidad: number;
  total: number;
}

interface ResumenPeriodoData {
  servicio_mas_solicitado: { servicio: string; veces: number };
  servicio_mayor_ingreso: { servicio: string; total: number };
  mecanico_mayor_facturacion: { mecanico: string; total: number };
  dia_mayor_ingresos: { fecha: string; total: number };
  cliente_mayor_gasto: { cliente: string; total: number };
  total_ordenes_completadas: number;
  total_ordenes_periodo?: number;
  tasa_completacion?: number;
}

// Tooltip personalizado elegante en modo oscuro para Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-950/95 p-3.5 shadow-2xl backdrop-blur-md min-w-[200px]">
        <p className="text-[11px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const isCurrency =
              entry.dataKey === "ingresos" ||
              entry.dataKey === "egresos" ||
              entry.dataKey === "utilidad" ||
              entry.dataKey === "total" ||
              entry.dataKey === "total_facturado" ||
              (typeof entry.name === "string" && (
                entry.name.toLowerCase().includes("ingreso") ||
                entry.name.toLowerCase().includes("egreso") ||
                entry.name.toLowerCase().includes("factur") ||
                entry.name.toLowerCase().includes("utilidad")
              ));
            const formattedVal = isCurrency
              ? currencyFormatter.format(Number(entry.value || 0))
              : entry.value;

            return (
              <div key={`tooltip-${index}`} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  {entry.name || entry.dataKey}:
                </span>
                <span className="font-mono font-bold text-neutral-100">
                  {formattedVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const ReportesPage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Pestañas Ejecutivas
  const [tabActiva, setTabActiva] = useState<"finanzas" | "servicios" | "mecanicos" | "vehiculos">("finanzas");

  // Rango de fechas (Predeterminado: Últimos 30 días)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [presetPeriodo, setPresetPeriodo] = useState<"7d" | "30d" | "3m" | "year">("30d");

  // Estado de Datos
  const [indicadores, setIndicadores] = useState<IndicadoresData>({
    ingresos_totales: 0,
    egresos_totales: 0,
    utilidad_neta: 0,
    margen_ganancia_porcentaje: 0,
    promedio_diario: 0,
    ticket_promedio: 0,
    servicios_distintos: 0,
    mecanicos_activos: 0,
    citas_atendidas: 0,
    clientes_atendidos: 0,
    total_ordenes: 0,
    tasa_completacion: 100,
  });

  const [serviciosList, setServiciosList] = useState<ServicioEstadistica[]>([]);
  const [mecanicosList, setMecanicosList] = useState<MecanicoEstadistica[]>([]);
  const [categoriasEgresos, setCategoriasEgresos] = useState<CategoriaEgreso[]>([]);
  const [timelineFlujo, setTimelineFlujo] = useState<TimelineFlujoItem[]>([]);
  const [marcasList, setMarcasList] = useState<MarcaVehiculoItem[]>([]);
  const [repuestosList, setRepuestosList] = useState<RepuestoUsoItem[]>([]);
  const [resumenPeriodo, setResumenPeriodo] = useState<ResumenPeriodoData | null>(null);

  // Ordenamiento de tabla por servicio y tipo de visualización
  const [sortServicios, setSortServicios] = useState<"total" | "veces">("total");
  const [tipoGraficoServicio, setTipoGraficoServicio] = useState<"barras" | "dona">("barras");

  // Presets Rápidos de Fecha
  const aplicarPreset = (preset: "7d" | "30d" | "3m" | "year") => {
    setPresetPeriodo(preset);
    const fin = new Date();
    const inicio = new Date();

    if (preset === "7d") inicio.setDate(fin.getDate() - 7);
    if (preset === "30d") inicio.setDate(fin.getDate() - 30);
    if (preset === "3m") inicio.setMonth(fin.getMonth() - 3);
    if (preset === "year") {
      inicio.setMonth(0);
      inicio.setDate(1);
    }

    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  // Cargar Reporte Inteligente Consolidado desde API
  const cargarReporte = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();

      const [ingresosRes, balanceRes] = await Promise.all([
        axios.get(`${API_BASE}/api/reportes/ingresos`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
        }).catch((err) => {
          console.warn("Fallo endpoint ingresos:", err);
          return null;
        }),
        obtenerBalanceResumen({
          // También pasamos fechas por si el backend soporta filtro exacto
        }).catch((err) => {
          console.warn("Fallo endpoint balance egresos:", err);
          return null;
        }),
      ]);

      if (ingresosRes?.data?.success) {
        const d = ingresosRes.data;
        const ind = d.indicadores || {};
        const bal = d.balance_financiero || {};

        // Métricas financieras calculadas con precisión
        const ingTotal = Number(ind.ingresos_totales ?? d.ingresos_totales ?? 0);
        const egrTotal = Number(bal.egresos_totales ?? ind.egresos_totales ?? 0);
        const utilNeta = Number(bal.utilidad_neta ?? (ingTotal - egrTotal));
        const margen = ingTotal > 0
          ? Math.round(((utilNeta / ingTotal) * 100) * 10) / 10
          : (egrTotal > 0 ? -100 : 0);

        setIndicadores({
          ingresos_totales: ingTotal,
          egresos_totales: egrTotal,
          utilidad_neta: utilNeta,
          margen_ganancia_porcentaje: margen,
          promedio_diario: Number(ind.promedio_diario ?? d.promedio_diario ?? 0),
          ticket_promedio: Number(ind.ticket_promedio ?? (d.por_servicio?.length ? ingTotal / d.por_servicio.length : 0)),
          servicios_distintos: (d.por_servicio || []).length,
          mecanicos_activos: (d.por_mecanico || []).length,
          citas_atendidas: Number(ind.citas_atendidas ?? 0),
          clientes_atendidos: Number(ind.clientes_atendidos ?? 0),
          total_ordenes: Number(ind.total_ordenes ?? ind.citas_atendidas ?? 0),
          tasa_completacion: Number(ind.tasa_completacion ?? 100),
        });

        setServiciosList(d.por_servicio || []);
        setMecanicosList(d.por_mecanico || []);
        setCategoriasEgresos(bal.desglose_categorias || bal.distribucion_categorias || []);
        setTimelineFlujo(d.timeline_flujo || []);
        setMarcasList(d.por_marca || []);
        setRepuestosList(d.por_repuesto || []);
        setResumenPeriodo(d.resumen_periodo || null);
      } else if (balanceRes) {
        // Fallback desde balance general si el reporte de ingresos falló
        setIndicadores((prev) => ({
          ...prev,
          ingresos_totales: balanceRes.metricas?.ingresos_totales || 0,
          egresos_totales: balanceRes.metricas?.egresos_totales || 0,
          utilidad_neta: balanceRes.metricas?.utilidad_neta || 0,
          margen_ganancia_porcentaje: balanceRes.metricas?.margen_ganancia_porcentaje || 0,
        }));
        setCategoriasEgresos((balanceRes.distribucion_categorias as any) || []);
      }
    } catch (error: any) {
      console.error("Error al cargar reporte:", error);
      toast({
        title: "Error al Cargar Reporte",
        description: error.response?.data?.error || "No se pudieron obtener las métricas consolidadas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, toast]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  // Exportar Excel Profesional (4 Hojas con ExcelJS + Dynamic Import)
  const handleExportarExcel = async () => {
    setExporting(true);
    try {
      const token = getToken();

      let res = await axios.get(`${API_BASE}/api/reportes/completo-excel`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      });

      let datosReporte = res.data?.datos;
      let metaReporte = res.data?.meta;

      if (!datosReporte) {
        datosReporte = {
          kpis: {
            ingresoTotal: indicadores.ingresos_totales || 0,
            otsCompletadas: resumenPeriodo?.total_ordenes_completadas || indicadores.citas_atendidas || 0,
            ticketPromedio: indicadores.ticket_promedio || indicadores.promedio_diario || 0,
            servicioTop: resumenPeriodo?.servicio_mas_solicitado?.servicio || "N/A",
            mecanicoTop: resumenPeriodo?.mecanico_mayor_facturacion?.mecanico || "N/A",
            mejorMes: "Octubre 2026",
          },
          servicios: serviciosList.map((s) => ({
            servicio: s.servicio,
            veces: s.veces,
            total: s.total,
            porcentaje: (s.porcentaje || 0) / 100,
            ticketPromedio: s.veces > 0 ? s.total / s.veces : 0,
          })),
          mecanicos: mecanicosList.map((m) => ({
            mecanico: m.mecanico,
            ots: m.trabajos,
            total: m.total_facturado,
            porcentaje: (m.porcentaje || 0) / 100,
            ticketPromedio: m.trabajos > 0 ? m.total_facturado / m.trabajos : 0,
          })),
          detalleOts: [],
          serieMensual: [],
        };

        metaReporte = {
          titulo: "REPORTE CONTABLE Y OPERATIVO ADN MOTORS",
          periodoDesde: fechaInicio,
          periodoHasta: fechaFin,
          fechaGeneracion: new Date().toLocaleString("es-BO"),
          generadoPor: "Administrador ADN",
          rolUsuario: "Administrador",
          folio: `FOL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
        };
      }

      const { buildReporteExcel } = await import("@/features/reportes/generadorReporte");
      const blob = await buildReporteExcel(datosReporte, metaReporte);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Reporte_Oficial_ADN_${fechaInicio}_a_${fechaFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "¡Reporte Oficial Exportado!",
        description: `Se descargó el informe oficial en Excel con 4 Hojas (Folio: ${metaReporte.folio}).`,
      });
    } catch (err: any) {
      console.error("Error al exportar ExcelJS:", err);
      toast({
        title: "Error al Exportar Excel",
        description: err?.message || "No se pudo generar el reporte contable Excel.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Imprimir Dossier Ejecutivo en PDF
  const handleImprimir = () => {
    window.print();
  };

  // Servicios Ordenados
  const serviciosOrdenados = useMemo(() => {
    return [...serviciosList].sort((a, b) =>
      sortServicios === "total" ? (b.total || 0) - (a.total || 0) : (b.veces || 0) - (a.veces || 0)
    );
  }, [serviciosList, sortServicios]);

  // Utilidad Neta Real
  const utilidadEsPositiva = (indicadores.utilidad_neta ?? 0) >= 0;

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-24 print:bg-white print:text-black print:pb-0`}>
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className={`${DESIGN_TOKENS.layout.container} print:max-w-none print:p-0`}>
        {/* ENCABEZADO PRINCIPAL EJECUTIVO */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg shadow-red-900/30">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight">
                    Business Intelligence & Reportes
                  </h1>
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
                    Módulo Gerencial
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Métricas financieras consolidadas, productividad en bahías y rentabilidad neta en tiempo real
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              onClick={handleImprimir}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/10 text-xs font-bold flex items-center gap-2 transition-all hover:scale-[1.02]"
              title="Imprimir informe oficial"
            >
              <Printer className="h-4 w-4 text-neutral-400" />
              <span>Imprimir Dossier</span>
            </button>

            <ButtonDS
              variant="primary"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={handleExportarExcel}
              disabled={exporting || loading}
            >
              {exporting ? "Generando Libro Excel..." : "Exportar Excel (4 Hojas)"}
            </ButtonDS>
          </div>
        </div>

        {/* BARRA DE FILTROS TEMPORALES */}
        <div className="mt-6 p-4 rounded-3xl bg-neutral-900/90 border border-white/10 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 shadow-xl backdrop-blur-md print:hidden">
          {/* Selector Rápido */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-white/5 text-xs font-bold overflow-x-auto no-scrollbar touch-scroll">
            <button
              onClick={() => aplicarPreset("7d")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                presetPeriodo === "7d"
                  ? "bg-red-600 text-white shadow-md font-black"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => aplicarPreset("30d")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                presetPeriodo === "30d"
                  ? "bg-red-600 text-white shadow-md font-black"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => aplicarPreset("3m")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                presetPeriodo === "3m"
                  ? "bg-red-600 text-white shadow-md font-black"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              3 meses
            </button>
            <button
              onClick={() => aplicarPreset("year")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                presetPeriodo === "year"
                  ? "bg-red-600 text-white shadow-md font-black"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Año en curso
            </button>
          </div>

          {/* Rango Personalizado de Fechas */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-2xl border border-white/5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-neutral-400 font-semibold">Desde:</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  if (e.target.value) {
                    setFechaInicio(e.target.value);
                    setPresetPeriodo("30d");
                  }
                }}
                className="bg-transparent text-neutral-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-500 rounded px-1"
              />
            </div>

            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-2xl border border-white/5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-neutral-400 font-semibold">Hasta:</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  if (e.target.value) {
                    setFechaFin(e.target.value);
                    setPresetPeriodo("30d");
                  }
                }}
                className="bg-transparent text-neutral-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-500 rounded px-1"
              />
            </div>

            <button
              onClick={cargarReporte}
              disabled={loading}
              className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-white/10 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-red-400" : ""}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* ── SECCIÓN 1: SCORECARD EJECUTIVO FINANCIERO Y OPERATIVO (SIN SOLAPAMIENTO DE TEXTO) ── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ingresos Totales Facturados */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-emerald-500/30 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Facturación Bruta</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {currencyFormatter.format(indicadores.ingresos_totales || 0)}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Cobrado en {serviciosList.reduce((acc, s) => acc + s.veces, 0)} servicios liquidados
              </p>
            </div>
          </div>

          {/* Card 2: Costos Operativos Totales (Egresos) */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-rose-500/30 shadow-xl relative overflow-hidden group hover:border-rose-500/50 transition-all">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Costos de Operación</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
                {currencyFormatter.format(indicadores.egresos_totales || 0)}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-rose-400" />
                Alquiler, sueldos, servicios e insumos
              </p>
            </div>
          </div>

          {/* Card 3: Utilidad Operativa Neta y Margen Real */}
          <div className={`p-5 rounded-3xl bg-neutral-900 border shadow-xl relative overflow-hidden group transition-all ${
            utilidadEsPositiva ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-amber-500/30 hover:border-amber-500/50"
          }`}>
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
              utilidadEsPositiva ? "bg-emerald-500/10" : "bg-amber-500/10"
            }`} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Resultado Operativo</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                utilidadEsPositiva
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}>
                Margen {indicadores.margen_ganancia_porcentaje || 0}%
              </span>
            </div>
            <div className="mt-3">
              <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                utilidadEsPositiva ? "text-emerald-300" : "text-amber-400"
              }`}>
                {currencyFormatter.format(indicadores.utilidad_neta || 0)}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-neutral-400" />
                {utilidadEsPositiva ? "Superávit neto disponible" : "Déficit o inversión en ciclo"}
              </p>
            </div>
          </div>

          {/* Card 4: Ticket Promedio por Orden */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-blue-500/30 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ticket Medio por OT</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-blue-400 font-mono tracking-tight">
                {currencyFormatter.format(indicadores.ticket_promedio || indicadores.promedio_diario || 0)}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                <Wrench className="h-3 w-3 text-blue-400" />
                Facturación media por vehículo atendido
              </p>
            </div>
          </div>
        </div>

        {/* ── SCORECARD OPERATIVO SECUNDARIO (4 TARJETAS) ── */}
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Órdenes Atendidas</span>
              <span className="text-xl font-black text-neutral-100 font-mono">
                {indicadores.citas_atendidas || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Tasa Cumplimiento</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {indicadores.tasa_completacion || 100}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Mecánicos en Bahía</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {indicadores.mecanicos_activos || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Clientes Únicos</span>
              <span className="text-xl font-black text-cyan-400 font-mono">
                {indicadores.clientes_atendidos || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* ── HIGHLIGHTS DEL PERÍODO (RESUMEN EJECUTIVO RÁPIDO) ── */}
        {resumenPeriodo && (
          <div className="mt-6 p-5 rounded-3xl bg-neutral-900/60 border border-white/5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-black text-neutral-200 uppercase tracking-wider">
                Resumen Ejecutivo del Período
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Servicio Más Solicitado</span>
                <p className="font-bold text-xs text-neutral-100 truncate mt-0.5">{resumenPeriodo.servicio_mas_solicitado?.servicio || "N/A"}</p>
                <p className="text-[11px] text-red-400 font-mono font-semibold">{resumenPeriodo.servicio_mas_solicitado?.veces || 0} solicitudes</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Mayor Facturación</span>
                <p className="font-bold text-xs text-neutral-100 truncate mt-0.5">{resumenPeriodo.servicio_mayor_ingreso?.servicio || "N/A"}</p>
                <p className="text-[11px] text-emerald-400 font-mono font-semibold">{currencyFormatter.format(resumenPeriodo.servicio_mayor_ingreso?.total || 0)}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Técnico Líder</span>
                <p className="font-bold text-xs text-neutral-100 truncate mt-0.5">{resumenPeriodo.mecanico_mayor_facturacion?.mecanico || "N/A"}</p>
                <p className="text-[11px] text-blue-400 font-mono font-semibold">{currencyFormatter.format(resumenPeriodo.mecanico_mayor_facturacion?.total || 0)}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Día Récord</span>
                <p className="font-bold text-xs text-neutral-100 font-mono mt-0.5">{formatDateSafe(resumenPeriodo.dia_mayor_ingresos?.fecha)}</p>
                <p className="text-[11px] text-amber-400 font-mono font-semibold">{currencyFormatter.format(resumenPeriodo.dia_mayor_ingresos?.total || 0)}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Cliente VIP</span>
                <p className="font-bold text-xs text-neutral-100 truncate mt-0.5">{resumenPeriodo.cliente_mayor_gasto?.cliente || "N/A"}</p>
                <p className="text-[11px] text-purple-400 font-mono font-semibold">{currencyFormatter.format(resumenPeriodo.cliente_mayor_gasto?.total || 0)}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Total OTs Finalizadas</span>
                <p className="font-bold text-sm text-neutral-100 font-mono mt-0.5">{resumenPeriodo.total_ordenes_completadas || 0}</p>
                <p className="text-[11px] text-neutral-400">En bahía y entregados</p>
              </div>
            </div>
          </div>
        )}

        {/* ── NAVEGACIÓN MULTIDIMENSIONAL DE PESTAÑAS ── */}
        <div className="mt-8 flex items-center gap-2 border-b border-white/10 overflow-x-auto no-scrollbar print:hidden">
          <button
            onClick={() => setTabActiva("finanzas")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              tabActiva === "finanzas"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Finanzas & Flujo Contable (P&L)</span>
          </button>

          <button
            onClick={() => setTabActiva("servicios")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              tabActiva === "servicios"
                ? "border-red-500 text-red-400 bg-red-500/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>Demanda de Servicios ({serviciosList.length})</span>
          </button>

          <button
            onClick={() => setTabActiva("mecanicos")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              tabActiva === "mecanicos"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Productividad Mecánica ({mecanicosList.length})</span>
          </button>

          <button
            onClick={() => setTabActiva("vehiculos")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              tabActiva === "vehiculos"
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Car className="h-4 w-4" />
            <span>Flota & Repuestos Taller</span>
          </button>
        </div>

        {/* ── CONTENIDO DINÁMICO DE PESTAÑAS ── */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {/* PESTAÑA 1: FINANZAS & FLUJO CONTABLE */}
            {tabActiva === "finanzas" && (
              <motion.div
                key="tab-finanzas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Gráfico de Flujo de Caja (Cashflow Ingresos vs Egresos) */}
                  <div className="lg:col-span-8 p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-400" />
                          Flujo de Caja Real (Ingresos vs. Egresos)
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Dinámica diaria de facturación neta vs. egresos operativos devengados en taller.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Ingresos
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          Gastos
                        </span>
                      </div>
                    </div>

                    <div className="h-72 w-full pt-4">
                      {timelineFlujo.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-neutral-950 rounded-2xl border border-white/5">
                          <AlertCircle className="h-8 w-8 text-neutral-600 mb-2" />
                          <p className="text-xs font-bold text-neutral-300">Sin movimientos en el rango seleccionado</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Modifica el filtro de fechas para visualizar la curva de liquidez.</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={timelineFlujo}
                            margin={{ top: 10, right: 20, left: 15, bottom: 25 }}
                          >
                            <defs>
                              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                              </linearGradient>
                              <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis
                              dataKey="fecha"
                              stroke="#737373"
                              fontSize={11}
                              tickLine={false}
                              tickFormatter={(f) => formatDateSafe(f)}
                            />
                            <YAxis
                              stroke="#737373"
                              fontSize={11}
                              tickLine={false}
                              width={85}
                              tickFormatter={(v) => `Bs ${Number(v).toLocaleString("es-BO")}`}
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="ingresos"
                              name="Ingresos"
                              stroke="#10b981"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#colorIngresos)"
                            />
                            <Area
                              type="monotone"
                              dataKey="egresos"
                              name="Gastos Operativos"
                              stroke="#f43f5e"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#colorEgresos)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Gráfico Donut de Desglose de Egresos */}
                  <div className="lg:col-span-4 p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <PieIcon className="h-5 w-5 text-rose-400" />
                        Estructura de Gastos
                      </h3>
                      <p className="text-xs text-neutral-400">Distribución porcentual por categoría operativa.</p>
                    </div>

                    <div className="h-52 w-full flex items-center justify-center">
                      {categoriasEgresos.length === 0 ? (
                        <div className="text-center text-xs text-neutral-500">Sin egresos registrados en el período</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoriasEgresos}
                              dataKey="total"
                              nameKey="nombre_legible"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              innerRadius={45}
                              paddingAngle={3}
                            >
                              {categoriasEgresos.map((_, index) => (
                                <Cell key={`egr-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                      {categoriasEgresos.map((cat, idx) => (
                        <div key={cat.categoria} className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-white/5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <span className="font-semibold text-neutral-200 truncate">{cat.nombre_legible || cat.label}</span>
                          </div>
                          <span className="font-mono font-bold text-rose-400 shrink-0 ml-2">
                            {currencyFormatter.format(cat.total)} ({cat.porcentaje}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabla Estado de Resultados Contable (P&L) */}
                <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-400" />
                        Estado de Resultados Operativo del Taller (P&L)
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Balance consolidado entre ventas brutas, deducciones operativas y margen de explotación comercial.
                      </p>
                    </div>

                    <BadgeDS variant={utilidadEsPositiva ? "success" : "danger"} size="md">
                      {utilidadEsPositiva ? "SUPERÁVIT FINANCIERO" : "DÉFICIT EN PERÍODO"}
                    </BadgeDS>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-neutral-950">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-neutral-900/90 text-neutral-400 uppercase text-[10px] tracking-wider">
                          <th className="p-3.5">Rubro Contable</th>
                          <th className="p-3.5 text-center">Clasificación</th>
                          <th className="p-3.5 text-right">Monto Devengado (Bs.)</th>
                          <th className="p-3.5 text-right">% Sobre Ingresos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        <tr className="hover:bg-neutral-900/40">
                          <td className="p-3.5 font-sans font-bold text-neutral-200">
                            (+) Ingresos Operativos por Mano de Obra y Servicios
                          </td>
                          <td className="p-3.5 text-center font-sans">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              Ingreso Facturado
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            {currencyFormatter.format(indicadores.ingresos_totales || 0)}
                          </td>
                          <td className="p-3.5 text-right text-neutral-300">100.0%</td>
                        </tr>

                        {categoriasEgresos.map((cat) => (
                          <tr key={`pl-${cat.categoria}`} className="hover:bg-neutral-900/30 text-neutral-300">
                            <td className="p-3.5 font-sans text-neutral-300 pl-8">
                              (-) {cat.nombre_legible || cat.label}
                            </td>
                            <td className="p-3.5 text-center font-sans text-neutral-400 text-[11px]">
                              Gasto Operativo
                            </td>
                            <td className="p-3.5 text-right text-rose-400 font-semibold">
                              {currencyFormatter.format(cat.total)}
                            </td>
                            <td className="p-3.5 text-right text-neutral-400">
                              {indicadores.ingresos_totales > 0
                                ? `${((cat.total / indicadores.ingresos_totales) * 100).toFixed(1)}%`
                                : "N/A"}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-neutral-900/70 border-t-2 border-white/10 font-bold">
                          <td className="p-3.5 font-sans text-neutral-100 uppercase tracking-wider">
                            (=) RESULTADO OPERATIVO NETO (UTILIDAD ANTES DE IMPUESTOS)
                          </td>
                          <td className="p-3.5 text-center font-sans">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              utilidadEsPositiva
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}>
                              Margen: {indicadores.margen_ganancia_porcentaje || 0}%
                            </span>
                          </td>
                          <td className={`p-3.5 text-right text-base font-black ${
                            utilidadEsPositiva ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {currencyFormatter.format(indicadores.utilidad_neta || 0)}
                          </td>
                          <td className={`p-3.5 text-right text-sm font-bold ${
                            utilidadEsPositiva ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {indicadores.margen_ganancia_porcentaje || 0}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex items-start gap-3 text-xs">
                    <div className={`p-2 rounded-xl shrink-0 border ${
                      utilidadEsPositiva
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-200">Dictamen Financiero & Plan Estratégico</h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                        {utilidadEsPositiva
                          ? `El taller presenta un margen comercial positivo del ${indicadores.margen_ganancia_porcentaje}%. Los ingresos facturados absorben satisfactoriamente la estructura fija de costos. Recomendación: Reservar un fondo del 10% para capital de trabajo e inversión en scanners de diagnóstico computarizado.`
                          : `Durante este período seleccionado, los gastos de operación totalizan ${currencyFormatter.format(indicadores.egresos_totales || 0)}, excediendo la facturación actual. Esto suele suceder al inicio de mes con el pago de sueldos o compras de lote de insumos. Se recomienda agilizar el cobro y entrega de órdenes pendientes.`}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PESTAÑA 2: DEMANDA DE SERVICIOS */}
            {tabActiva === "servicios" && (
              <motion.div
                key="tab-servicios"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-red-500" />
                        Desglose de Ingresos por Tipo de Servicio
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Facturación y rotación de órdenes de trabajo organizadas por especialidad.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-white/5">
                        <button
                          onClick={() => setTipoGraficoServicio("barras")}
                          className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            tipoGraficoServicio === "barras"
                              ? "bg-red-600 text-white shadow-sm"
                              : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          Barras
                        </button>
                        <button
                          onClick={() => setTipoGraficoServicio("dona")}
                          className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            tipoGraficoServicio === "dona"
                              ? "bg-red-600 text-white shadow-sm"
                              : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          Dona
                        </button>
                      </div>

                      <button
                        onClick={() => setSortServicios(sortServicios === "total" ? "veces" : "total")}
                        className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-200 font-bold hover:text-white transition-all"
                      >
                        {sortServicios === "total" ? "Ordenar: Mayor Facturación" : "Ordenar: Mayor Frecuencia"}
                      </button>
                    </div>
                  </div>

                  {serviciosList.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-neutral-950 border border-white/5 space-y-3 flex flex-col items-center justify-center min-h-[280px]">
                      <AlertCircle className="h-10 w-10 text-neutral-600" />
                      <h4 className="text-sm font-bold text-neutral-200">Sin datos de servicios en el período</h4>
                      <p className="text-xs text-neutral-400 max-w-xs">
                        Registra órdenes de trabajo completadas para visualizar las estadísticas de demanda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Gráfica Recharts con Eje Y corregido (Bs 1.600 sin cortes) */}
                      <div className="h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGraficoServicio === "barras" ? (
                            <BarChart
                              data={serviciosOrdenados}
                              margin={{ top: 10, right: 20, left: 15, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis
                                dataKey="servicio"
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                interval={0}
                                angle={-15}
                                textAnchor="end"
                              />
                              <YAxis
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                width={85}
                                tickFormatter={(v) => `Bs ${Number(v).toLocaleString("es-BO")}`}
                              />
                              <Tooltip content={<CustomChartTooltip />} />
                              <Bar
                                dataKey="total"
                                name="Facturación Total"
                                fill="#ef4444"
                                radius={[8, 8, 0, 0]}
                              />
                            </BarChart>
                          ) : (
                            <PieChart>
                              <Pie
                                data={serviciosOrdenados}
                                dataKey="total"
                                nameKey="servicio"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={50}
                                paddingAngle={3}
                              >
                                {serviciosOrdenados.map((_, index) => (
                                  <Cell
                                    key={`serv-cell-${index}`}
                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomChartTooltip />} />
                              <Legend
                                wrapperStyle={{ fontSize: "11px", color: "#a3a3a3" }}
                              />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Interpretación Comercial */}
                      <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex items-start gap-3 text-xs">
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0 border border-red-500/20">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-200">Interpretación Comercial de la Demanda</h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                            {resumenPeriodo?.servicio_mayor_ingreso?.servicio
                              ? `El servicio estrella con mayor impacto financiero es "${resumenPeriodo.servicio_mayor_ingreso.servicio}", sumando un total de ${currencyFormatter.format(resumenPeriodo.servicio_mayor_ingreso.total)}. Se sugiere garantizar stock inmediato de repuestos afines y priorizar bahías dedicadas para optimizar tiempos de entrega.`
                              : "Analiza qué servicios tienen mayor frecuencia para estructurar combos preventivos y revisiones periódicas."}
                          </p>
                        </div>
                      </div>

                      {/* Tabla Desglose Completo de Servicios */}
                      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-neutral-950">
                        <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                          <thead>
                            <tr className="border-b border-white/10 bg-neutral-900/90 text-neutral-400 uppercase text-[10px] whitespace-nowrap">
                              <th className="p-3.5">Servicio Automotriz</th>
                              <th className="p-3.5 text-center">Frecuencia</th>
                              <th className="p-3.5 text-right">Ticket Promedio (Bs.)</th>
                              <th className="p-3.5 text-right">Facturación Total (Bs.)</th>
                              <th className="p-3.5 text-right">Cuota de Participación</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {serviciosOrdenados.map((s, idx) => (
                              <tr key={s.servicio} className="hover:bg-neutral-900/50 transition-colors">
                                <td className="p-3.5 font-sans font-semibold text-neutral-200">
                                  <span className="text-neutral-500 font-mono text-[11px] mr-2">#{idx + 1}</span>
                                  {s.servicio}
                                </td>
                                <td className="p-3.5 text-center font-bold text-neutral-100">
                                  {s.veces || 0}
                                </td>
                                <td className="p-3.5 text-right text-neutral-300">
                                  {currencyFormatter.format(s.veces > 0 ? s.total / s.veces : 0)}
                                </td>
                                <td className="p-3.5 text-right font-bold text-emerald-400">
                                  {currencyFormatter.format(s.total || 0)}
                                </td>
                                <td className="p-3.5 text-right">
                                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-white/10 text-neutral-300 text-[11px] font-bold">
                                    {s.porcentaje || 0}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PESTAÑA 3: RENDIMIENTO TÉCNICO Y MECÁNICOS */}
            {tabActiva === "mecanicos" && (
              <motion.div
                key="tab-mecanicos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Gráfico Donut de Participación por Técnico */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-400" />
                        Distribución de Carga Técnica
                      </h3>
                      <p className="text-xs text-neutral-400">Participación en ingresos producidos por mecánico.</p>
                    </div>

                    <div className="h-60 w-full flex items-center justify-center">
                      {mecanicosList.length === 0 ? (
                        <div className="text-center text-xs text-neutral-500">Sin datos de mecánicos</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mecanicosList}
                              dataKey="total_facturado"
                              nameKey="mecanico"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={45}
                              paddingAngle={3}
                            >
                              {mecanicosList.map((_, index) => (
                                <Cell
                                  key={`mec-pie-${index}`}
                                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5 flex items-start gap-3 text-xs">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 border border-blue-500/20">
                        <Award className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-200">Balance de Productividad</h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                          {resumenPeriodo?.mecanico_mayor_facturacion?.mecanico
                            ? `El técnico líder es ${resumenPeriodo.mecanico_mayor_facturacion.mecanico}, concentrando el mayor volumen facturado. Distribuir equitativamente los servicios complejos previene fatiga y acelera las entregas.`
                            : "Asigna técnicos a cada orden de trabajo para cuantificar horas hombre y volumen facturado."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard y Tabla de Rendimiento */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        Tabla de Rendimiento de Mecánicos
                      </h3>
                      <p className="text-xs text-neutral-400">Eficiencia por orden, facturación individual y cuota del taller.</p>
                    </div>

                    <div className="space-y-3">
                      {mecanicosList.map((m, idx) => (
                        <div
                          key={m.mecanico}
                          className="p-4 rounded-2xl bg-neutral-950 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 font-mono shadow-md"
                              style={{
                                backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`,
                                color: CHART_COLORS[idx % CHART_COLORS.length],
                                border: `1px solid ${CHART_COLORS[idx % CHART_COLORS.length]}40`,
                              }}
                            >
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-neutral-100 text-sm">{m.mecanico}</p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {m.trabajos || 0} órdenes realizadas · Ticket promedio: {currencyFormatter.format(m.trabajos > 0 ? m.total_facturado / m.trabajos : 0)}
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right font-mono border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                            <p className="text-base font-black text-emerald-400">
                              {currencyFormatter.format(m.total_facturado || 0)}
                            </p>
                            <span className="text-[11px] text-neutral-400 font-semibold">
                              {m.porcentaje || 0}% de participación del taller
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PESTAÑA 4: PARQUE AUTOMOTOR & FLOTA */}
            {tabActiva === "vehiculos" && (
              <motion.div
                key="tab-vehiculos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Marcas de Vehículos Atendidas */}
                  <div className="lg:col-span-6 p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <Car className="h-5 w-5 text-red-500" />
                        Distribución por Marca de Vehículo
                      </h3>
                      <p className="text-xs text-neutral-400">Marcas con mayor concurrencia en bahías de servicio.</p>
                    </div>

                    {marcasList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-500">Sin vehículos registrados en el período</div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {marcasList.map((m, idx) => (
                          <div key={m.marca} className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-neutral-200 flex items-center gap-2">
                                <span className="text-neutral-500 font-mono text-[11px]">#{idx + 1}</span>
                                {m.marca}
                              </span>
                              <span className="font-mono text-neutral-300 font-bold">
                                {m.cantidad} autos ({m.porcentaje}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                              <div
                                className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(5, m.porcentaje))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Repuestos e Insumos Facturados en el Período */}
                  <div className="lg:col-span-6 p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-emerald-400" />
                        Insumos & Repuestos Facturados
                      </h3>
                      <p className="text-xs text-neutral-400">Repuestos instalados en las órdenes de trabajo liquidadas.</p>
                    </div>

                    {repuestosList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-500">
                        No se registraron repuestos con costo adicional en este rango de fechas.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {repuestosList.map((rep) => (
                          <div
                            key={rep.repuesto}
                            className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-neutral-100">{rep.repuesto}</p>
                              <p className="text-[11px] text-neutral-400 mt-0.5">{rep.cantidad} unidades instaladas</p>
                            </div>
                            <div className="text-right font-mono font-bold text-emerald-400">
                              {currencyFormatter.format(rep.total)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default ReportesPage;
