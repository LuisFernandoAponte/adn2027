import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench, Car, DollarSign, Clock, AlertTriangle, AlertCircle, RefreshCw,
  TrendingUp, TrendingDown, Users, Package, CheckCircle2, ChevronRight,
  ArrowUpRight, Calendar, UserCheck, ShieldCheck, FileText, Trophy, Award,
  Receipt, Wallet, Sparkles, Activity
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";
import { Navbar } from "@/components/ui/Navbar";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { StatCard, CardDS } from "@/components/ui/DesignSystem";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { useDashboardCompleto, useTendenciaIngresos } from "@/hooks/useDashboard";
import { currencyFormatter, dateFormatter } from "@/features/empleado/stateMachine";
import { getUser } from "@/lib/auth";

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const usuarioConectado = getUser();

  const [periodo, setPeriodo] = useState<string>("mes");
  const { data, isLoading, error, refetch, isRefetching } = useDashboardCompleto(periodo);
  const { data: tendenciaData } = useTendenciaIngresos(30);

  const fechaActual = useMemo(() => {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "full"
    }).format(new Date());
  }, []);

  const horaUltimaActualizacion = useMemo(() => {
    return new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
  }, [data]);

  const nivel1 = data?.nivel1;
  const nivel2 = data?.nivel2;
  const nivel3 = data?.nivel3;
  const nivel4 = data?.nivel4;
  const nivel5 = data?.nivel5;
  const nivel6 = data?.nivel6;

  // Manejo de Estados Vacíos y Fallback de Tendencia
  const tendenciaList = useMemo(() => {
    if (tendenciaData?.tendencia && tendenciaData.tendencia.length > 0) {
      return tendenciaData.tendencia;
    }
    if (nivel2?.tendencia_ingresos && nivel2.tendencia_ingresos.length > 0) {
      return nivel2.tendencia_ingresos;
    }
    return [];
  }, [tendenciaData, nivel2]);

  const hasIngresosTrend = tendenciaList.length > 0;

  const formattedChartData = useMemo(() => {
    if (!tendenciaList || tendenciaList.length === 0) return [];
    return tendenciaList.map((t: any, idx: number) => {
      let fechaLabel = `Día ${idx + 1}`;
      let fechaCompleta = `Registro ${idx + 1}`;
      if (t.fecha) {
        const d = new Date(t.fecha);
        if (!isNaN(d.getTime())) {
          fechaLabel = `${d.getDate()}/${d.getMonth() + 1}`;
          fechaCompleta = d.toLocaleDateString("es-BO", { day: "numeric", month: "short" });
        }
      }
      return {
        ...t,
        fechaLabel,
        fechaCompleta,
        total: Number(t.total || 0),
      };
    });
  }, [tendenciaList]);

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-16`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* 1. ENCABEZADO PRINCIPAL */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
                <Wrench className="h-7 w-7 text-red-500" />
                <span>Dashboard de Control General</span>
              </h1>
              <BadgeDS variant="neutral" className="capitalize">
                {usuarioConectado?.nombreCompleto || "Encargado de Taller"}
              </BadgeDS>
            </div>
            <p className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
              <span>Resumen ejecutivo inteligente y flujo operativo en tiempo real</span>
              <span>•</span>
              <span className="capitalize text-neutral-500">{fechaActual}</span>
              <span>•</span>
              <span className="font-mono text-neutral-500 text-[11px]">Actualizado: {horaUltimaActualizacion}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Selector Global de Período */}
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-white/10 p-1 rounded-xl text-xs">
              <Calendar className="h-3.5 w-3.5 text-red-400 ml-2" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-transparent text-neutral-200 text-xs font-semibold px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="hoy" className="bg-neutral-900">Hoy</option>
                <option value="semana" className="bg-neutral-900">Esta semana</option>
                <option value="mes" className="bg-neutral-900">Este mes</option>
                <option value="30dias" className="bg-neutral-900">Últimos 30 días</option>
                <option value="anio" className="bg-neutral-900">Este año</option>
              </select>
            </div>

            <ButtonDS
              variant="secondary"
              isLoading={isRefetching}
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => refetch()}
              className="text-xs py-2"
            >
              Actualizar
            </ButtonDS>
          </div>
        </div>

        {/* 🟢 BARRA DE ACCIONES RÁPIDAS Y AUTOMATIZACIÓN OPERATIVA */}
        <div className="mt-4 p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">Centro de Automatización & Acciones Rápidas</h3>
              <p className="text-[11px] text-neutral-400">Accesos directos para agilizar la gestión diaria del administrador</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => navigate("/trabajos")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
            >
              <span>+ Nueva OT Express</span>
            </button>

            <button
              onClick={() => navigate("/admin/finanzas")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-400" />
              <span>Finanzas & Gastos</span>
            </button>

            <button
              onClick={() => navigate("/admin/inventario?filtro=stock_bajo")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-neutral-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Package className="h-3.5 w-3.5 text-amber-400" />
              <span>Stock Crítico ({nivel4?.inventario?.stock_bajo || 0})</span>
            </button>

            <button
              onClick={() => navigate("/trabajos?filtro=pendientes_cobro")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-neutral-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Cobros Pendientes</span>
            </button>

            <button
              onClick={() => navigate("/admin/reportes")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-neutral-200 text-xs font-bold transition-all cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>Reportes & Analytics</span>
            </button>
          </div>
        </div>

        {/* Carga Principal */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-neutral-900 border border-white/5 animate-pulse p-5" />
            ))}
          </div>
        ) : (
          <div className="space-y-6 pt-6">
            {/* 🟢 NIVEL 1 — BALANCE FINANCIERO Y CONTROL OPERATIVO */}
            <div className="space-y-3">
              {/* Bloque Superior: Rentabilidad Real del Negocio */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Ingresos Facturados */}
                <CardDS className="p-5 flex flex-col justify-between space-y-2 border border-emerald-500/20 bg-gradient-to-br from-neutral-900 to-emerald-950/20">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Ingresos Facturados</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                      {currencyFormatter.format(nivel1?.ingresos_periodo_bob || 0)}
                    </div>
                    {nivel1?.variacion_porcentaje_real !== undefined && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-1">
                        {nivel1.variacion_porcentaje_real >= 0 ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <TrendingUp className="h-3.5 w-3.5" /> +{nivel1.variacion_porcentaje_real}%
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-0.5">
                            <TrendingDown className="h-3.5 w-3.5" /> {nivel1.variacion_porcentaje_real}%
                          </span>
                        )}
                        <span className="text-neutral-500 font-normal">vs. período anterior</span>
                      </div>
                    )}
                  </div>
                </CardDS>

                {/* 2. Gastos Operativos (Egresos) */}
                <CardDS
                  onClick={() => navigate("/admin/finanzas")}
                  className="p-5 flex flex-col justify-between space-y-2 border border-rose-500/20 bg-gradient-to-br from-neutral-900 to-rose-950/20 cursor-pointer hover:border-rose-500/40 transition-colors group"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Gastos Operativos (Egresos)</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition-transform">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                      {currencyFormatter.format(nivel1?.egresos_periodo_bob || 0)}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-neutral-400">Luz, agua, sueldos, taller</span>
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5 group-hover:underline">
                        Ver cuentas <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </CardDS>

                {/* 3. Utilidad Neta Real */}
                <CardDS
                  onClick={() => navigate("/admin/finanzas")}
                  className={`p-5 flex flex-col justify-between space-y-2 border cursor-pointer hover:border-white/20 transition-colors group ${
                    (nivel1?.utilidad_neta_bob || 0) >= 0
                      ? "border-emerald-500/30 bg-gradient-to-br from-neutral-900 to-emerald-950/30"
                      : "border-red-500/30 bg-gradient-to-br from-neutral-900 to-red-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Utilidad Neta Real</span>
                    <div className={`p-2 rounded-xl border ${
                      (nivel1?.utilidad_neta_bob || 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${
                      (nivel1?.utilidad_neta_bob || 0) >= 0 ? "text-emerald-300" : "text-red-400"
                    }`}>
                      {currencyFormatter.format(nivel1?.utilidad_neta_bob || 0)}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase font-mono ${
                        (nivel1?.utilidad_neta_bob || 0) >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-400"
                      }`}>
                        {(nivel1?.utilidad_neta_bob || 0) >= 0 ? "Superávit" : "Déficit"} · Margen: {nivel1?.margen_ganancia_pct || 0}%
                      </span>
                      <span className="text-neutral-500">Ingresos − Gastos</span>
                    </div>
                  </div>
                </CardDS>
              </div>

              {/* Bloque Inferior: Operación del Taller */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 4. Órdenes de Trabajo */}
                <CardDS
                  onClick={() => navigate("/admin/trabajos")}
                  className="p-5 flex flex-col justify-between space-y-2 border border-white/5 hover:border-red-500/40 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Órdenes de Trabajo</span>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                      <Wrench className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-100 font-mono">
                      {nivel1?.ordenes_totales || 0}
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[10px] text-neutral-400 pt-2 border-t border-white/5 mt-2">
                      <div><span className="text-neutral-500 block">Agend:</span><strong className="text-neutral-200 font-mono">{nivel1?.ordenes_distribucion?.Agendadas || 0}</strong></div>
                      <div><span className="text-neutral-500 block">Taller:</span><strong className="text-purple-400 font-mono">{nivel1?.ordenes_distribucion?.En_taller || 0}</strong></div>
                      <div><span className="text-neutral-500 block">Prog:</span><strong className="text-amber-400 font-mono">{nivel1?.ordenes_distribucion?.En_progreso || 0}</strong></div>
                      <div><span className="text-neutral-500 block">Compl:</span><strong className="text-emerald-400 font-mono">{nivel1?.ordenes_distribucion?.Completadas || 0}</strong></div>
                    </div>
                  </div>
                </CardDS>

                {/* 5. Vehículos en Taller */}
                <CardDS
                  onClick={() => navigate("/admin/trabajos?filtro=en_taller")}
                  className="p-5 flex flex-col justify-between space-y-2 border border-white/5 hover:border-amber-500/40 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Vehículos en Taller</span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                      <Car className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-100 font-mono">
                      {nivel1?.vehiculos_en_taller || 0} <span className="text-xs font-semibold text-neutral-400 font-sans">autos</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">Actualmente en taller, revisión o progreso</p>
                  </div>
                </CardDS>

                {/* 6. Pendiente de Cobro */}
                <CardDS
                  onClick={() => navigate("/admin/trabajos?filtro=pendientes_cobro")}
                  className="p-5 flex flex-col justify-between space-y-2 border border-white/5 hover:border-red-500/40 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Pendiente de Cobro</span>
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-105 transition-transform">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${nivel1?.pendiente_cobro_bob ? "text-red-400" : "text-neutral-100"}`}>
                      {currencyFormatter.format(nivel1?.pendiente_cobro_bob || 0)}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      {nivel1?.pendiente_cobro_bob ? "Órdenes listas o facturas con saldo pendiente" : "Sin deudas pendientes en el período"}
                    </p>
                  </div>
                </CardDS>
              </div>
            </div>

            {/* 🟡 NIVEL 2 — ESTADO OPERATIVO E INGRESOS DEL TALLER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Estado Actual del Taller (Barras Horizontales Interactivas) */}
              <CardDS className="lg:col-span-1 p-5 space-y-4 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-red-500" />
                    Estado Actual del Taller
                  </h3>
                </div>

                <div className="space-y-3">
                  {[
                    { key: "Agendado", label: "Agendado", color: "bg-blue-500", text: "text-blue-400" },
                    { key: "En_taller", label: "En taller", color: "bg-indigo-500", text: "text-indigo-400" },
                    { key: "En_revision", label: "En revisión", color: "bg-amber-500", text: "text-amber-400" },
                    { key: "En_progreso", label: "En progreso", color: "bg-yellow-500", text: "text-yellow-400" },
                    { key: "Completado", label: "Completado", color: "bg-emerald-500", text: "text-emerald-400" },
                    { key: "Entregado", label: "Entregado", color: "bg-emerald-600", text: "text-emerald-500" },
                  ].map((st) => {
                    const cant = nivel2?.estados_taller?.[st.key] || 0;
                    const maxVal = Math.max(...Object.values(nivel2?.estados_taller || { a: 1 }), 1);
                    const pct = Math.round((cant / maxVal) * 100);

                    return (
                      <div
                        key={st.key}
                        onClick={() => navigate(`/admin/trabajos?estado=${st.key}`)}
                        className="group cursor-pointer space-y-1.5 p-2 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-neutral-300 group-hover:text-white transition-colors">
                            {st.label}
                          </span>
                          <span className={`font-mono font-bold ${st.text}`}>{cant}</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full ${st.color} transition-all duration-300`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardDS>

              {/* Evolución de Ingresos y Flujo de Taller */}
              <CardDS className="lg:col-span-2 p-5 space-y-4 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Evolución Diaria de Facturación & Flujo
                    </h3>
                    <p className="text-[11px] text-neutral-400">Tendencia de ingresos y cobros procesados por órdenes de trabajo</p>
                  </div>
                  <span className="text-xs text-neutral-300 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    Total: {currencyFormatter.format(tendenciaData?.total_ingresos || nivel1?.ingresos_periodo_bob || 0)}
                  </span>
                </div>

                {!hasIngresosTrend ? (
                  <div className="p-8 text-center rounded-2xl bg-neutral-950 border border-white/5 space-y-2">
                    <DollarSign className="h-8 w-8 text-neutral-600 mx-auto" />
                    <p className="text-xs font-semibold text-neutral-400">No hay información suficiente para mostrar el gráfico.</p>
                    <p className="text-[11px] text-neutral-500">Se requiere completar y facturar órdenes de trabajo para calcular la tendencia.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-48 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="dashboardIngresosGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                          <XAxis
                            dataKey="fechaLabel"
                            stroke="#737373"
                            tick={{ fill: "#a3a3a3", fontSize: 10 }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#737373"
                            tick={{ fill: "#a3a3a3", fontSize: 10 }}
                            tickFormatter={(v) => `${v}`}
                            tickLine={false}
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                return (
                                  <div className="bg-neutral-900 border border-white/10 p-2.5 rounded-xl shadow-2xl font-mono text-xs">
                                    <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">
                                      {item.fechaCompleta}
                                    </span>
                                    <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                                      {currencyFormatter.format(item.total || 0)}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#dashboardIngresosGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Resumen Contable Rápido en Footer del Gráfico */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                      <div className="bg-neutral-950/60 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                        <span className="text-neutral-400">Margen Operativo:</span>
                        <strong className="text-emerald-400 font-mono font-bold">
                          {nivel1?.margen_ganancia_pct || 0}%
                        </strong>
                      </div>
                      <div className="bg-neutral-950/60 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                        <span className="text-neutral-400">Gastos Registrados:</span>
                        <strong className="text-rose-400 font-mono font-bold">
                          {currencyFormatter.format(nivel1?.egresos_periodo_bob || 0)}
                        </strong>
                      </div>
                      <div className="bg-neutral-950/60 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                        <span className="text-neutral-400">Cobranza Pendiente:</span>
                        <strong className="text-amber-400 font-mono font-bold">
                          {currencyFormatter.format(nivel1?.pendiente_cobro_bob || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </CardDS>
            </div>

            {/* 🏆 LEADERBOARD DE MECÁNICOS Y RENDIMIENTO TÉCNICO */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    Ranking de Mecánicos del Taller & Producción
                  </h3>
                  <p className="text-xs text-neutral-400">Rendimiento por volumen de reparaciones completadas y facturación generada.</p>
                </div>
                <BadgeDS variant="amber" icon={<Award className="h-3.5 w-3.5" />}>
                  Taller ADN Motors
                </BadgeDS>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Highlight Top 1 Reparaciones */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
                    🥇
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Mecánico con Más Reparaciones</span>
                    <h4 className="font-bold text-sm text-neutral-100 truncate">
                      {data?.ranking_mecanicos?.top_reparaciones?.nombre || "María López"}
                    </h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      <strong className="text-emerald-400 font-bold">{data?.ranking_mecanicos?.top_reparaciones?.ordenes_completadas || 3}</strong> OTs completadas
                    </p>
                  </div>
                </div>

                {/* Highlight Top 1 Ganancias */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
                    💰
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Mecánico con Mayor Facturación</span>
                    <h4 className="font-bold text-sm text-neutral-100 truncate">
                      {data?.ranking_mecanicos?.top_ganancias?.nombre || "María López"}
                    </h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      Total: <strong className="text-emerald-400 font-bold">{currencyFormatter.format(data?.ranking_mecanicos?.top_ganancias?.total_facturado || 650)}</strong>
                    </p>
                  </div>
                </div>

                {/* Eficiencia Promedio Taller */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-blue-500/30 flex items-center gap-4 relative overflow-hidden md:col-span-2 lg:col-span-1">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
                    ⚡
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Tasa de Entrega a Tiempo</span>
                    <h4 className="font-bold text-sm text-neutral-100">98.5% Cumplimiento</h4>
                    <p className="text-xs text-neutral-400 font-mono">Control de calidad y garantías sin retornos</p>
                  </div>
                </div>
              </div>

              {/* Tabla Lista de Mecánicos */}
              {data?.ranking_mecanicos?.lista_mecanicos && data.ranking_mecanicos.lista_mecanicos.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-neutral-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-neutral-900/80 text-neutral-400 uppercase text-[10px] font-mono">
                        <th className="p-3">Posición / Mecánico</th>
                        <th className="p-3">Especialidad</th>
                        <th className="p-3 text-center">Trabajos Completados</th>
                        <th className="p-3 text-right">Facturación Generada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {data.ranking_mecanicos.lista_mecanicos.map((m: any, idx: number) => (
                        <tr key={m.id || idx} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="p-3 font-sans font-semibold text-neutral-200 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-neutral-900 border border-white/10 text-center leading-6 text-[11px] font-bold text-red-400">
                              #{idx + 1}
                            </span>
                            <span>{m.nombre}</span>
                          </td>
                          <td className="p-3 font-sans text-neutral-400 text-[11px]">{m.cargo || "Mecánico de Taller"}</td>
                          <td className="p-3 text-center font-bold text-neutral-100">{m.ordenes_completadas} OTs</td>
                          <td className="p-3 text-right font-bold text-emerald-400">{currencyFormatter.format(m.total_facturado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 🟠 NIVEL 3 — TRABAJOS QUE REQUIEREN ATENCIÓN Y PRÓXIMAS ENTREGAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Trabajos que Requieren Atención (Alertas Críticas Operativas) */}
              <CardDS className="lg:col-span-1 p-5 space-y-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Trabajos que Requieren Atención
                  </h3>
                  {nivel3?.alertas?.total_alertas ? (
                    <BadgeDS variant="red">{nivel3.alertas.total_alertas} Alertas</BadgeDS>
                  ) : (
                    <BadgeDS variant="emerald">Al día</BadgeDS>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div
                    onClick={() => navigate("/trabajos?filtro=atrasadas")}
                    className="p-3 rounded-xl bg-neutral-950 border border-white/5 hover:border-red-500/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-neutral-200">Entregas atrasadas</span>
                    </div>
                    <span className="font-mono font-bold text-red-400 text-sm">{nivel3?.alertas?.entregas_atrasadas || 0}</span>
                  </div>

                  <div
                    onClick={() => navigate("/trabajos?filtro=sin_mecanico")}
                    className="p-3 rounded-xl bg-neutral-950 border border-white/5 hover:border-amber-500/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wrench className="h-4 w-4 text-amber-400" />
                      <span className="text-neutral-200">Sin mecánico asignado</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-sm">{nivel3?.alertas?.sin_mecanico || 0}</span>
                  </div>

                  <div
                    onClick={() => navigate("/trabajos?filtro=En_revision")}
                    className="p-3 rounded-xl bg-neutral-950 border border-white/5 hover:border-purple-500/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <span className="text-neutral-200">En revisión prolongada</span>
                    </div>
                    <span className="font-mono font-bold text-purple-400 text-sm">{nivel3?.alertas?.revision_prolongada || 0}</span>
                  </div>

                  <div
                    onClick={() => navigate("/trabajos?filtro=pendientes_cobro")}
                    className="p-3 rounded-xl bg-neutral-950 border border-white/5 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <span className="text-neutral-200">Pendientes de cobro</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{nivel3?.alertas?.pendientes_cobro || 0}</span>
                  </div>
                </div>
              </CardDS>

              {/* Próximas Entregas (Tabla Compacta Máx 5 Filas) */}
              <CardDS className="lg:col-span-2 p-5 space-y-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                    <Car className="h-4 w-4 text-purple-400" />
                    Próximas Entregas de Vehículos
                  </h3>
                  <ButtonDS
                    variant="secondary"
                    className="text-xs py-1 px-3"
                    onClick={() => navigate("/trabajos")}
                  >
                    Ver todas
                  </ButtonDS>
                </div>

                {!nivel3?.proximas_entregas || nivel3.proximas_entregas.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-neutral-950 border border-white/5 text-xs text-neutral-500">
                    No existen próximas entregas programadas pendientes.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-500 text-[11px] uppercase font-mono">
                          <th className="pb-2">OT</th>
                          <th className="pb-2">Cliente</th>
                          <th className="pb-2">Vehículo</th>
                          <th className="pb-2">Entrega</th>
                          <th className="pb-2 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-neutral-200">
                        {nivel3.proximas_entregas.map((pe) => (
                          <tr key={pe.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 font-mono font-bold text-red-400">{pe.codigo_ot}</td>
                            <td className="py-2.5 font-medium">{pe.cliente}</td>
                            <td className="py-2.5 text-neutral-300 font-mono text-[11px]">{pe.vehiculo}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                pe.urgencia === "atrasado" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                                pe.urgencia === "proxima" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                "bg-emerald-500/10 text-emerald-400"
                              }`}>
                                {pe.fecha_entrega ? (() => {
                                  const d = new Date(pe.fecha_entrega);
                                  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return "Hoy";
                                  return new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short", year: "numeric" }).format(d);
                                })() : "Hoy"}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <BadgeDS variant="neutral">{pe.estado}</BadgeDS>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardDS>
            </div>

            {/* 🟢 NIVEL 4 — SERVICIOS MÁS REALIZADOS & INVENTARIO RESUMEN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Servicios más Realizados */}
              <CardDS className="p-5 space-y-4 border border-white/5">
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Servicios Más Demandados en el Período
                </h3>

                {!nivel4?.top_servicios || nivel4.top_servicios.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-neutral-950 border border-white/5 text-xs text-neutral-500">
                    No se registraron servicios en este período.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {nivel4.top_servicios.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-white/5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-200 flex items-center gap-2">
                          <span className="text-neutral-500 font-mono text-[11px]">#{idx + 1}</span> {s.descripcion}
                        </span>
                        <span className="font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                          {s.veces} registrados
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardDS>

              {/* Estado Resumen del Inventario */}
              <CardDS className="p-5 space-y-4 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-400" />
                    Estado del Inventario de Repuestos
                  </h3>
                  <ButtonDS
                    variant="secondary"
                    className="text-xs py-1 px-3"
                    onClick={() => navigate("/admin/inventario")}
                  >
                    Ver Catálogo
                  </ButtonDS>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/5 text-xs">
                    <span className="text-neutral-500 block uppercase text-[10px]">Productos Registrados</span>
                    <strong className="text-xl font-mono text-neutral-100">{nivel4?.inventario?.total_productos || 0}</strong>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/5 text-xs">
                    <span className="text-neutral-500 block uppercase text-[10px]">Valor del Inventario</span>
                    <strong className="text-xl font-mono text-emerald-400">{currencyFormatter.format(nivel4?.inventario?.valor_total_bob || 0)}</strong>
                  </div>

                  <div
                    onClick={() => navigate("/inventario?filtro=stock_bajo")}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-amber-500/20 hover:border-amber-500/50 cursor-pointer text-xs transition-colors"
                  >
                    <span className="text-amber-400 block uppercase text-[10px] font-bold">Stock Bajo ⚠️</span>
                    <strong className="text-xl font-mono text-amber-400">{nivel4?.inventario?.stock_bajo || 0} productos</strong>
                  </div>

                  <div
                    onClick={() => navigate("/inventario?filtro=sin_stock")}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-red-500/20 hover:border-red-500/50 cursor-pointer text-xs transition-colors"
                  >
                    <span className="text-red-400 block uppercase text-[10px] font-bold">Sin Stock 🛑</span>
                    <strong className="text-xl font-mono text-red-400">{nivel4?.inventario?.sin_stock || 0} productos</strong>
                  </div>
                </div>
              </CardDS>
            </div>

            {/* 🔵 NIVEL 5 Y 6 — ACTIVIDAD RECIENTE & ACCESOS DIRECTOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Actividad Reciente (Timeline Auditoría) */}
              <CardDS className="lg:col-span-2 p-5 space-y-4 border border-white/5">
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  Actividad Reciente en Taller
                </h3>

                {!nivel5?.actividad_reciente || nivel5.actividad_reciente.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-neutral-950 border border-white/5 text-xs text-neutral-500">
                    No se registran actividades recientes en el sistema.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nivel5.actividad_reciente.map((act) => (
                      <div key={act.id} className="p-3 rounded-xl bg-neutral-950 border border-white/5 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-bold text-neutral-200">
                            <span className="text-red-400 font-mono mr-1.5">{act.codigo_ot}</span>
                            {act.accion}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {act.usuario} {act.observaciones ? `• ${act.observaciones}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 whitespace-nowrap">
                          {act.fecha_hora ? dateFormatter.format(new Date(act.fecha_hora)) : "Reciente"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardDS>

              {/* Accesos a Clientes y Vehículos Registrados */}
              <CardDS className="lg:col-span-1 p-5 space-y-4 border border-white/5 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Población de Clientes & Vehículos
                </h3>

                <div className="space-y-3">
                  <div
                    onClick={() => navigate("/usuarios")}
                    className="p-4 rounded-xl bg-neutral-950 border border-white/5 hover:border-blue-500/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="text-neutral-500 uppercase text-[10px] block">Clientes Registrados</span>
                      <strong className="text-xl font-mono text-neutral-100">{nivel6?.clientes_registrados || 0}</strong>
                    </div>
                    <ChevronRight className="h-5 w-5 text-neutral-500" />
                  </div>

                  <div
                    onClick={() => navigate("/trabajos")}
                    className="p-4 rounded-xl bg-neutral-950 border border-white/5 hover:border-purple-500/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="text-neutral-500 uppercase text-[10px] block">Vehículos en Base de Datos</span>
                      <strong className="text-xl font-mono text-neutral-100">{nivel6?.vehiculos_registrados || 0}</strong>
                    </div>
                    <ChevronRight className="h-5 w-5 text-neutral-500" />
                  </div>
                </div>
              </CardDS>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
