import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Calendar, Download, RefreshCw, DollarSign, Wrench, Users,
  CheckCircle2, UserCheck, TrendingUp, Award, Star, Trophy, ShieldCheck,
  FileSpreadsheet, Filter, Sparkles, AlertCircle, ArrowUpRight, Clock,
  PieChart as PieIcon, Layers, FileText
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { StatCard, CardDS } from "@/components/ui/DesignSystem";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_BASE } from "@/api/config";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { currencyFormatter, dateFormatter } from "@/features/empleado/stateMachine";

// Helper robusto y seguro para formateo de fechas
export const formatDateSafe = (value: unknown, fallback: string = "N/A"): string => {
  if (!value || value === "N/A" || value === "null" || value === "undefined") {
    return fallback;
  }
  const strVal = String(value).trim();
  if (!strVal || strVal === "N/A") return fallback;

  // Evitar desfasaje UTC en strings 'YYYY-MM-DD'
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

// Colores curated para gráficos en tema oscuro
const CHART_COLORS = [
  "#ef4444", // Rojo primario
  "#3b82f6", // Azul
  "#10b981", // Esmeralda
  "#f59e0b", // Ámbar
  "#8b5cf6", // Púrpura
  "#06b6d4", // Cían
  "#ec4899", // Rosa
  "#64748b", // Pizarra
];

interface IndicadoresData {
  ingresos_totales: number;
  promedio_diario: number;
  servicios_distintos: number;
  mecanicos_activos: number;
  citas_atendidas: number;
  clientes_atendidos: number;
}

interface ServicioEstadistica {
  servicio: string;
  veces: number;
  total: number;
  porcentaje: number;
}

interface MecanicoEstadistica {
  mecanico: string;
  trabajos: number;
  total_facturado: number;
  porcentaje: number;
}

interface ResumenPeriodoData {
  servicio_mas_solicitado: { servicio: string; veces: number };
  servicio_mayor_ingreso: { servicio: string; total: number };
  mecanico_mayor_facturacion: { mecanico: string; total: number };
  dia_mayor_ingresos: { fecha: string; total: number };
  cliente_mayor_gasto: { cliente: string; total: number };
  total_ordenes_completadas: number;
}

export const ReportesPage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Rango de fechas (Predeterminado: Últimos 30 días)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [presetPeriodo, setPresetPeriodo] = useState<"7d" | "30d" | "3m">("30d");

  // Estado de Datos
  const [indicadores, setIndicadores] = useState<IndicadoresData>({
    ingresos_totales: 0,
    promedio_diario: 0,
    servicios_distintos: 0,
    mecanicos_activos: 0,
    citas_atendidas: 0,
    clientes_atendidos: 0,
  });
  const [serviciosList, setServiciosList] = useState<ServicioEstadistica[]>([]);
  const [mecanicosList, setMecanicosList] = useState<MecanicoEstadistica[]>([]);
  const [resumenPeriodo, setResumenPeriodo] = useState<ResumenPeriodoData | null>(null);

  // Ordenamiento de tabla por servicio
  const [sortServicios, setSortServicios] = useState<"total" | "veces">("total");

  // Presets Rápidos de Fecha
  const aplicarPreset = (preset: "7d" | "30d" | "3m") => {
    setPresetPeriodo(preset);
    const fin = new Date();
    const inicio = new Date();

    if (preset === "7d") inicio.setDate(fin.getDate() - 7);
    if (preset === "30d") inicio.setDate(fin.getDate() - 30);
    if (preset === "3m") inicio.setMonth(fin.getMonth() - 3);

    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  // Cargar Reporte Inteligente desde API
  const cargarReporte = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await axios.get(`${API_BASE}/api/reportes/ingresos`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
      });

      const data = response.data;
      if (data && data.success) {
        setIndicadores(
          data.indicadores || {
            ingresos_totales: Number(data.ingresos_totales || 0),
            promedio_diario: Number(data.promedio_diario || 0),
            servicios_distintos: (data.por_servicio || []).length,
            mecanicos_activos: (data.por_mecanico || []).length,
            citas_atendidas: 0,
            clientes_atendidos: 0,
          }
        );
        setServiciosList(data.por_servicio || []);
        setMecanicosList(data.por_mecanico || []);
        setResumenPeriodo(data.resumen_periodo || null);
      }
    } catch (error: any) {
      console.error("Error al cargar reporte:", error);
      toast({
        title: "Error al Cargar Reporte",
        description: error.response?.data?.error || "No se pudieron obtener las métricas del reporte.",
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

      // 1. Obtener datos estructurados del backend
      let res = await axios.get(`${API_BASE}/api/reportes/completo-excel`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
      });

      let datosReporte = res.data?.datos;
      let metaReporte = res.data?.meta;

      // Fallback local si el endpoint nuevo no responde datos completos
      if (!datosReporte) {
        datosReporte = {
          kpis: {
            ingresoTotal: indicadores.ingresos_totales || 0,
            otsCompletadas: resumenPeriodo?.total_ordenes_completadas || 0,
            ticketPromedio: indicadores.promedio_diario || 0,
            servicioTop: resumenPeriodo?.servicio_mas_solicitado?.servicio || "N/A",
            mecanicoTop: resumenPeriodo?.mecanico_mayor_facturacion?.mecanico || "N/A",
            mejorMes: "Agosto 2026",
          },
          servicios: serviciosList.map((s) => ({
            servicio: s.servicio,
            veces: s.veces,
            total: s.total,
            porcentaje: (s.porcentaje || 0) / 100, // guardar como fracción decimal
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

      // 2. Dynamic Import (Code-Splitting) del generador ExcelJS
      const { buildReporteExcel } = await import("@/features/reportes/generadorReporte");

      // 3. Captura opcional de Gráficos Recharts en pantalla a imágenes Base64
      let serviciosBase64: string | undefined = undefined;
      try {
        const chartSvg = document.querySelector(".recharts-responsive-container svg");
        if (chartSvg) {
          const svgString = new XMLSerializer().serializeToString(chartSvg);
          const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          const URLObj = window.URL || window.webkitURL || window;
          const blobURL = URLObj.createObjectURL(svgBlob);
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = blobURL;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 580;
          canvas.height = img.height || 280;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            serviciosBase64 = canvas.toDataURL("image/png");
          }
          URLObj.revokeObjectURL(blobURL);
        }
      } catch (chartErr) {
        console.warn("No se pudo capturar imagen del gráfico:", chartErr);
      }

      // 4. Generación pura del Blob Excel contable de 4 Hojas
      const blob = await buildReporteExcel(datosReporte, metaReporte, { serviciosBase64 });

      // 5. Descarga directa en navegador sin FileSaver
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Reporte_Contable_ADN_${fechaInicio}_a_${fechaFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "¡Reporte Contable Exportado!",
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

  // Fallback CSV Generator en Frontend
  const generarCSVFallback = () => {
    let csv = `REPORTE INTELIGENTE ADN MOTORS (${fechaInicio} a ${fechaFin})\n\n`;
    csv += `INDICADORES CLAVE\n`;
    csv += `Ingresos Totales,Bs. ${(indicadores.ingresos_totales || 0).toFixed(2)}\n`;
    csv += `Promedio Diario,Bs. ${(indicadores.promedio_diario || 0).toFixed(2)}\n`;
    csv += `Servicios Distintos,${indicadores.servicios_distintos || 0}\n`;
    csv += `Mecanicos Activos,${indicadores.mecanicos_activos || 0}\n`;
    csv += `Citas Atendidas,${indicadores.citas_atendidas || 0}\n`;
    csv += `Clientes Atendidos,${indicadores.clientes_atendidos || 0}\n\n`;

    csv += `INGRESOS POR SERVICIO\nServicio,Cantidad,Total (Bs),%\n`;
    serviciosList.forEach((s) => {
      csv += `"${s.servicio}",${s.veces},${(s.total || 0).toFixed(2)},${s.porcentaje || 0}%\n`;
    });

    csv += `\nFACTURACION POR MECANICO\nMecanico,Servicios,Total (Bs),%\n`;
    mecanicosList.forEach((m) => {
      csv += `"${m.mecanico}",${m.trabajos},${(m.total_facturado || 0).toFixed(2)},${m.porcentaje || 0}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Reporte_Taller_${fechaInicio}_a_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast({
      title: "Reporte Exportado (CSV)",
      description: "Se descargó el informe estructurado en formato CSV.",
    });
  };

  // Servicios Ordenados
  const serviciosOrdenados = useMemo(() => {
    return [...serviciosList].sort((a, b) =>
      sortServicios === "total" ? (b.total || 0) - (a.total || 0) : (b.veces || 0) - (a.veces || 0)
    );
  }, [serviciosList, sortServicios]);

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-24`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* ENCABEZADO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="h-7 w-7 text-red-500" />
              <span>Reportes</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-red-400" />
              Análisis inteligente del taller con datos en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS
              variant="primary"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={handleExportarExcel}
              disabled={exporting || loading}
            >
              {exporting ? "Exportando..." : "Exportar Excel"}
            </ButtonDS>
          </div>
        </div>

        {/* BARRA DE FILTROS DE PERÍODO */}
        <div className="mt-6 p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl">
          {/* Botones de Selección Rápida */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-white/5 text-xs font-bold">
            <button
              onClick={() => aplicarPreset("7d")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                presetPeriodo === "7d"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Últimos 7 días
            </button>

            <button
              onClick={() => aplicarPreset("30d")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                presetPeriodo === "30d"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Últimos 30 días
            </button>

            <button
              onClick={() => aplicarPreset("3m")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                presetPeriodo === "3m"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Últimos 3 meses
            </button>
          </div>

          {/* Selector de Rango Personalizado */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400 font-semibold">Fecha inicio:</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  if (e.target.value) {
                    setFechaInicio(e.target.value);
                    setPresetPeriodo("30d");
                  }
                }}
                className="rounded-xl border border-white/10 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400 font-semibold">Fecha fin:</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  if (e.target.value) {
                    setFechaFin(e.target.value);
                    setPresetPeriodo("30d");
                  }
                }}
                className="rounded-xl border border-white/10 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <ButtonDS
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={cargarReporte}
              disabled={loading}
              className="text-xs py-2"
            >
              Actualizar
            </ButtonDS>
          </div>
        </div>

        {/* 6 TARJETAS ESTADÍSTICAS PRINCIPALES (KPIS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pt-6">
          <StatCard
            title="Ingresos Totales"
            value={currencyFormatter.format(indicadores.ingresos_totales || 0)}
            subtitle="En el período seleccionado"
            icon={<DollarSign className="h-6 w-6" />}
            variant="emerald"
          />

          <StatCard
            title="Promedio Diario"
            value={currencyFormatter.format(indicadores.promedio_diario || 0)}
            subtitle="Promedio del período"
            icon={<TrendingUp className="h-6 w-6" />}
            variant="blue"
          />

          <StatCard
            title="Servicios Distintos"
            value={indicadores.servicios_distintos || 0}
            subtitle="Tipos de servicio facturados"
            icon={<Wrench className="h-6 w-6" />}
            variant="purple"
          />

          <StatCard
            title="Mecánicos Activos"
            value={indicadores.mecanicos_activos || 0}
            subtitle="Mecánicos con servicios registrados"
            icon={<UserCheck className="h-6 w-6" />}
            variant="amber"
          />

          <StatCard
            title="Citas Atendidas"
            value={indicadores.citas_atendidas || 0}
            subtitle="Citas completadas"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="red"
          />

          <StatCard
            title="Clientes Atendidos"
            value={indicadores.clientes_atendidos || 0}
            subtitle="Clientes atendidos"
            icon={<Users className="h-6 w-6" />}
            variant="cyan"
          />
        </div>

        {/* SECCIÓN RESUMEN DEL PERÍODO (TOP HIGHLIGHTS) */}
        {resumenPeriodo && (
          <div className="pt-6 space-y-3">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Resumen del período
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Highlight 1: Servicio Más Solicitado */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Servicio más solicitado</span>
                <p className="font-bold text-sm text-neutral-100 truncate">{resumenPeriodo.servicio_mas_solicitado?.servicio || "Sin datos"}</p>
                <p className="text-xs text-red-400 font-mono font-semibold">
                  {resumenPeriodo.servicio_mas_solicitado?.veces || 0} solicitudes
                </p>
              </div>

              {/* Highlight 2: Servicio Mayor Ingreso */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Servicio que generó mayores ingresos</span>
                <p className="font-bold text-sm text-neutral-100 truncate">{resumenPeriodo.servicio_mayor_ingreso?.servicio || "Sin datos"}</p>
                <p className="text-xs text-emerald-400 font-mono font-semibold">
                  {currencyFormatter.format(resumenPeriodo.servicio_mayor_ingreso?.total || 0)}
                </p>
              </div>

              {/* Highlight 3: Mecánico Mayor Facturación */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Mecánico con mayor facturación</span>
                <p className="font-bold text-sm text-neutral-100 truncate">{resumenPeriodo.mecanico_mayor_facturacion?.mecanico || "Sin datos"}</p>
                <p className="text-xs text-blue-400 font-mono font-semibold">
                  {currencyFormatter.format(resumenPeriodo.mecanico_mayor_facturacion?.total || 0)}
                </p>
              </div>

              {/* Highlight 4: Día con Mayores Ingresos */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Día con mayores ingresos</span>
                <p className="font-bold text-sm text-neutral-100 font-mono">
                  {formatDateSafe(resumenPeriodo.dia_mayor_ingresos?.fecha)}
                </p>
                <p className="text-xs text-amber-400 font-mono font-semibold">
                  {currencyFormatter.format(resumenPeriodo.dia_mayor_ingresos?.total || 0)}
                </p>
              </div>

              {/* Highlight 5: Cliente Mayor Gasto */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Cliente con mayor gasto</span>
                <p className="font-bold text-sm text-neutral-100 truncate">{resumenPeriodo.cliente_mayor_gasto?.cliente || "Sin datos"}</p>
                <p className="text-xs text-purple-400 font-mono font-semibold">
                  {currencyFormatter.format(resumenPeriodo.cliente_mayor_gasto?.total || 0)}
                </p>
              </div>

              {/* Highlight 6: Total Órdenes Completadas */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Total de órdenes de trabajo completadas</span>
                <p className="font-bold text-xl text-neutral-100 font-mono">{resumenPeriodo.total_ordenes_completadas || 0}</p>
                <p className="text-[11px] text-neutral-400 font-semibold">Trabajos finalizados</p>
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICOS PRINCIPALES (2 COLUMNAS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">

          {/* GRÁFICO 1: INGRESOS POR SERVICIO (7 Col) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-red-500" />
                    Ingresos por Servicio
                  </h3>
                  <p className="text-xs text-neutral-400">Desglose de facturación y volumen según el tipo de servicio.</p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">Ordenar:</span>
                  <button
                    onClick={() => setSortServicios(sortServicios === "total" ? "veces" : "total")}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-white/10 text-neutral-200 font-bold hover:text-white"
                  >
                    {sortServicios === "total" ? "Mayor Ingreso" : "Mayor Frecuencia"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-neutral-400 animate-pulse flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-red-500" />
                  Cargando análisis de ingresos por servicio...
                </div>
              ) : serviciosList.length === 0 ? (
                /* Estado Vacío Profesional */
                <div className="p-12 text-center rounded-2xl bg-neutral-950 border border-white/5 space-y-3 flex flex-col items-center justify-center min-h-[280px]">
                  <AlertCircle className="h-10 w-10 text-neutral-600" />
                  <h4 className="text-sm font-bold text-neutral-200">Sin datos disponibles</h4>
                  <p className="text-xs text-neutral-400 max-w-xs">
                    Registra servicios facturados para comenzar a visualizar el análisis.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Gráfico BarChart de Recharts */}
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serviciosOrdenados.slice(0, 6)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="servicio" stroke="#888888" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `Bs.${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#ffffff" }}
                          itemStyle={{ color: "#ffffff", fontWeight: "bold" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: "600" }}
                          formatter={(value: any) => [currencyFormatter.format(Number(value || 0)), "Ingreso Total"]}
                        />
                        <Bar dataKey="total" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabla Desglose de Servicios */}
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-neutral-950">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-neutral-900/80 text-neutral-400 uppercase text-[10px]">
                          <th className="p-3">Nombre del servicio</th>
                          <th className="p-3 text-center">Cantidad de servicios realizados</th>
                          <th className="p-3 text-right">Ingresos generados</th>
                          <th className="p-3 text-right">Porcentaje de participación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {serviciosOrdenados.map((s, idx) => (
                          <tr key={s.servicio} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="p-3 font-sans font-semibold text-neutral-200">
                              <span className="text-neutral-500 font-mono text-[11px] mr-2">#{idx + 1}</span>
                              {s.servicio}
                            </td>
                            <td className="p-3 text-center font-bold text-neutral-100">{s.veces || 0}</td>
                            <td className="p-3 text-right font-bold text-emerald-400">{currencyFormatter.format(s.total || 0)}</td>
                            <td className="p-3 text-right">
                              <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-white/10 text-neutral-300 text-[11px]">
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
          </div>

          {/* GRÁFICO 2: FACTURACIÓN POR MECÁNICO (5 Col) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-400" />
                  Facturación por Mecánico
                </h3>
                <p className="text-xs text-neutral-400">Rendimiento y volumen facturado por cada profesional.</p>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-neutral-400 animate-pulse flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                  Cargando comparativa por mecánico...
                </div>
              ) : mecanicosList.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-neutral-950 border border-white/5 space-y-3 flex flex-col items-center justify-center min-h-[280px]">
                  <Users className="h-10 w-10 text-neutral-600" />
                  <h4 className="text-sm font-bold text-neutral-200">Sin datos de mecánicos</h4>
                  <p className="text-xs text-neutral-400 max-w-xs">
                    Asigna mecánicos a las órdenes de trabajo para visualizar su rendimiento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Gráfico PieChart de Participación */}
                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mecanicosList}
                          dataKey="total_facturado"
                          nameKey="mecanico"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {mecanicosList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#ffffff" }}
                          itemStyle={{ color: "#ffffff", fontWeight: "bold" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: "600" }}
                          formatter={(val: any) => [currencyFormatter.format(Number(val || 0)), "Facturación"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista de Mecánicos */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {mecanicosList.map((m, idx) => (
                      <div key={m.mecanico} className="p-3 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <div>
                            <p className="font-bold text-neutral-100">{m.mecanico}</p>
                            <p className="text-[11px] text-neutral-400">{m.trabajos || 0} servicios realizados</p>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <p className="font-bold text-emerald-400">{currencyFormatter.format(m.total_facturado || 0)}</p>
                          <span className="text-[10px] text-neutral-400">{m.porcentaje || 0}% de participación</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportesPage;
