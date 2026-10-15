import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, Plus, RefreshCw, AlertTriangle, DollarSign, Filter,
  BadgeAlert, Pencil, History, PackagePlus, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertCircle, ShoppingCart, TrendingUp, Tag, Building,
  Trash2, Eye, ShieldAlert, Layers, Box
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { StatCard } from "@/components/ui/DesignSystem";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { CardDS } from "@/components/ui/DesignSystem";
import { useToast } from "@/hooks/use-toast";
import {
  obtenerInventario,
  crearInventarioItem,
  actualizarInventarioItem,
  eliminarInventarioItem,
  ajustarStock,
  obtenerResumenInventarioApi,
  type InventarioItem,
  type ResumenInventario,
} from "@/api/inventarioApi";
import ModalInventario from "@/components/inventario/ModalInventario";
import StockAdjustmentModal from "@/components/inventario/StockAdjustmentModal";
import MovementHistoryModal from "@/components/inventario/MovementHistoryModal";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { currencyFormatter } from "@/features/empleado/stateMachine";

const CATEGORIES = [
  { label: "Todas las Categorías", value: "Todas" },
  { label: "Motor", value: "motor" },
  { label: "Frenos", value: "frenos" },
  { label: "Suspensión", value: "suspension" },
  { label: "Electricidad", value: "electricidad" },
  { label: "Filtros", value: "filtros" },
  { label: "Aceites", value: "aceites" },
  { label: "Llantas", value: "llantas" },
  { label: "Carrocería", value: "carroceria" },
  { label: "Otros", value: "otros" },
];

export const InventarioPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [resumenData, setResumenData] = useState<ResumenInventario | null>(null);
  const [topUtilizados, setTopUtilizados] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState<"Todos" | "Normal" | "Stock Bajo" | "Crítico" | "Agotado">("Todos");

  useEffect(() => {
    const filtroParam = searchParams.get("filtro");
    if (filtroParam === "stock_bajo") {
      setFiltroEstado("Stock Bajo");
    }
  }, [searchParams]);

  // Modales
  const [openModal, setOpenModal] = useState(false);
  const [itemEditar, setItemEditar] = useState<InventarioItem | null>(null);

  const [openStockModal, setOpenStockModal] = useState(false);
  const [stockItem, setStockItem] = useState<InventarioItem | null>(null);

  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [historyItemId, setHistoryItemId] = useState("");
  const [historyItemNombre, setHistoryItemNombre] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resumenRes, listData] = await Promise.all([
        obtenerResumenInventarioApi().catch(() => null),
        obtenerInventario({
          categoria: categoria !== "Todas" ? categoria : undefined,
        }),
      ]);

      if (resumenRes && resumenRes.resumen) {
        setResumenData(resumenRes.resumen);
        setTopUtilizados(resumenRes.top_mas_utilizados || []);
      }
      setItems(listData || []);
    } catch (error: any) {
      console.error("Error al cargar inventario:", error);
      toast({
        title: "Error de Carga",
        description: "No se pudo actualizar el inventario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [categoria]);

  // Filtrado Memorizado de Productos
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      // Filtro por Estado Calculado
      if (filtroEstado === "Agotado" && item.stockActual !== 0) return false;
      if (filtroEstado === "Crítico" && (item.stockActual === 0 || item.stockActual > Math.floor(item.stockMinimo / 2))) return false;
      if (filtroEstado === "Stock Bajo" && (!item.stock_bajo || item.stockActual === 0)) return false;
      if (filtroEstado === "Normal" && item.stock_bajo) return false;

      // Filtro por Búsqueda
      if (!debouncedSearch) return true;
      const codeStr = (item.codigo || "").toLowerCase();
      const nameStr = (item.nombre || "").toLowerCase();
      const catStr = (item.categoria || "").toLowerCase();
      const provStr = (typeof item.proveedor === "string" ? item.proveedor : item.proveedor?.nombre || "").toLowerCase();
      const ubiStr = (item.ubicacion || "").toLowerCase();

      return (
        codeStr.includes(debouncedSearch) ||
        nameStr.includes(debouncedSearch) ||
        catStr.includes(debouncedSearch) ||
        provStr.includes(debouncedSearch) ||
        ubiStr.includes(debouncedSearch)
      );
    });
  }, [items, filtroEstado, debouncedSearch]);

  // Lista de Productos en Alerta (Agotados, Críticos, Bajo Stock)
  const productosEnAlerta = useMemo(() => {
    return items.filter((i) => i.stockActual <= i.stockMinimo);
  }, [items]);

  // Manejadores de Acciones de Inventario
  const handleCrearGuardar = async (formData: any) => {
    try {
      if (itemEditar) {
        await actualizarInventarioItem(itemEditar.id, formData);
        toast({ title: "Repuesto Actualizado", description: `Se actualizaron los datos de ${formData.nombre}.` });
      } else {
        await crearInventarioItem(formData);
        toast({ title: "Repuesto Registrado", description: `Se dio de alta el repuesto ${formData.nombre}.` });
      }
      setItemEditar(null);
      await cargarDatos();
    } catch (err: any) {
      toast({
        title: "Error al guardar repuesto",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleAjustarStockSubmit = async (id: string, data: { cantidad: number; tipo: string; observaciones?: string }) => {
    try {
      await ajustarStock(id, data);
      toast({ title: "Stock Actualizado", description: "El movimiento fue registrado correctamente en la bitácora." });
      await cargarDatos();
    } catch (err: any) {
      toast({
        title: "Error al ajustar stock",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleEliminarDesactivar = async (item: InventarioItem) => {
    if (!window.confirm(`¿Deseas dar de baja el repuesto "${item.nombre}" (${item.codigo})?`)) return;
    try {
      await eliminarInventarioItem(item.id);
      toast({ title: "Repuesto Desactivado", description: "El repuesto fue dado de baja conservando su historial de transacciones." });
      await cargarDatos();
    } catch (err: any) {
      toast({
        title: "Error al desactivar",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // Badges y Renderizado de Estados
  const getBadgeEstadoStock = (stock: number, min: number) => {
    if (stock === 0) {
      return (
        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
          🔴 Agotado
        </span>
      );
    }
    if (stock <= Math.floor(min / 2)) {
      return (
        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
          🟠 Crítico
        </span>
      );
    }
    if (stock <= min) {
      return (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
          🟡 Stock Bajo
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
        🟢 Normal
      </span>
    );
  };

  // Cálculo de totales dinámicos si no vienen del resumen
  const totalRepuestosCount = resumenData?.total_repuestos || items.length;
  const totalUnidadesCount = resumenData?.total_unidades || items.reduce((acc, i) => acc + (i.stockActual || 0), 0);
  const valorCostoTotal = resumenData?.valor_inventario_costo || items.reduce((acc, i) => acc + (i.costo * i.stockActual), 0);
  const valorVentaTotal = resumenData?.valor_potencial_venta || items.reduce((acc, i) => acc + (i.precio_venta * i.stockActual), 0);
  const stockBajoCount = resumenData?.count_stock_bajo || items.filter((i) => i.stock_bajo).length;
  const agotadosCount = resumenData?.count_agotados || items.filter((i) => i.stockActual === 0).length;

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-20`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <Package className="h-7 w-7 text-red-500" />
              <span>Control de Inventario & Repuestos</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Gestión de stock en tiempo real, trazabilidad de repuestos en OT y valorización comercial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setItemEditar(null);
                setOpenModal(true);
              }}
            >
              Registrar Nuevo Repuesto
            </ButtonDS>

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

        {/* 5 Tarjetas KPIs Superiores Automáticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 pt-4">
          <StatCard
            title="Total de Repuestos (SKUs)"
            value={totalRepuestosCount}
            subtitle={`${totalUnidadesCount.toLocaleString("es-BO")} unidades físicas`}
            icon={<Box className="h-6 w-6" />}
            variant="blue"
          />

          <StatCard
            title="Valor Inventario (A Costo)"
            value={currencyFormatter.format(valorCostoTotal)}
            subtitle="Inversión real acumulada"
            icon={<DollarSign className="h-6 w-6" />}
            variant="purple"
          />

          <StatCard
            title="Valor Potencial de Venta"
            value={currencyFormatter.format(valorVentaTotal)}
            subtitle="Representación comercial"
            icon={<TrendingUp className="h-6 w-6" />}
            variant="emerald"
          />

          <StatCard
            title="Repuestos Stock Bajo"
            value={stockBajoCount}
            subtitle="Por debajo del stock mínimo"
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="amber"
          />

          <StatCard
            title="Agotados (Sin Stock)"
            value={agotadosCount}
            subtitle="Requieren reabastecimiento"
            icon={<BadgeAlert className="h-6 w-6" />}
            variant="red"
          />
        </div>

        {/* Banner de Alertas Automáticas (Si hay repuestos en stock bajo o agotados) */}
        {productosEnAlerta.length > 0 && (
          <div className="rounded-3xl bg-neutral-900 border border-red-500/30 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
                <h3 className="text-sm font-bold text-neutral-100">
                  Alertas Automáticas de Reabastecimiento ({productosEnAlerta.length})
                </h3>
              </div>
              <span className="text-xs text-neutral-400 font-mono">Prioridad de Compra</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {productosEnAlerta.slice(0, 3).map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-400">{item.codigo}</span>
                    {getBadgeEstadoStock(item.stockActual, item.stockMinimo)}
                  </div>
                  <p className="font-bold text-neutral-200 text-sm truncate">{item.nombre}</p>
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Stock: <strong className="text-neutral-100 font-mono">{item.stockActual}</strong> / Mín: {item.stockMinimo}</span>
                    <span className="text-red-400 font-mono font-semibold">Comprar +{Math.max(1, item.stockMinimo * 2 - item.stockActual)} u</span>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-neutral-500 text-[10px] truncate max-w-[130px]">
                      🏢 {typeof item.proveedor === "string" ? item.proveedor : item.proveedor?.nombre || "Sin Proveedor"}
                    </span>
                    <button
                      onClick={() => {
                        setStockItem(item);
                        setOpenStockModal(true);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                    >
                      <PackagePlus className="h-3.5 w-3.5" /> Reabastecer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Repuestos Más Utilizados (Rotación) & Filtros */}
        <div className="space-y-4 pt-2">
          {topUtilizados.length > 0 && (
            <div className="rounded-2xl bg-neutral-900 border border-white/5 p-4 space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Repuestos Más Utilizados en Órdenes de Trabajo (Alta Rotación)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {topUtilizados.map((top, idx) => (
                  <div key={top.id} className="p-2.5 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-red-400 font-bold">#{idx + 1} {top.codigo}</span>
                    <p className="font-semibold text-neutral-200 truncate">{top.nombre}</p>
                    <p className="text-[11px] text-emerald-400 font-mono">Usos: {top.total_usos || 0} u</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros Avanzados & Buscador */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-neutral-900/80 border border-white/5 p-4 rounded-2xl">
            {/* Buscador Global */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar repuesto por código, nombre, proveedor o ubicación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500"
              />
            </div>

            {/* Filtros de Categoría y Estado */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Categoría */}
              <div className="flex items-center gap-1.5 bg-neutral-950 border border-white/10 px-3 py-1.5 rounded-xl">
                <Tag className="h-3.5 w-3.5 text-neutral-400" />
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="bg-transparent text-xs text-neutral-200 focus:outline-none font-semibold cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-neutral-900 text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Estado Stock */}
              <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 p-1 rounded-xl text-xs font-semibold">
                {(["Todos", "Normal", "Stock Bajo", "Crítico", "Agotado"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFiltroEstado(st)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filtroEstado === st
                        ? "bg-red-600 text-white shadow"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Inventario Mejorada */}
        <div className="pt-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-neutral-900/60 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-neutral-950 border border-white/5 space-y-3">
              <Package className="h-10 w-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-200">No se encontraron repuestos</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No hay artículos que coincidan con la búsqueda o filtros aplicados.
              </p>
              <ButtonDS
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setItemEditar(null);
                  setOpenModal(true);
                }}
              >
                Registrar Repuesto
              </ButtonDS>
            </div>
          ) : (
            <>
              {/* VISTA TARJETAS MÓVILES (< 768px) */}
              <div className="block md:hidden space-y-3">
                {itemsFiltrados.map((item, index) => {
                  const margenUnitario = item.precio_venta - item.costo;
                  const margenPct = item.costo > 0 ? (margenUnitario / item.costo) * 100 : 0;
                  const valCosto = item.stockActual * item.costo;
                  const valVenta = item.stockActual * item.precio_venta;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                              {item.codigo}
                            </span>
                            {item.ubicacion && (
                              <span className="text-[10px] text-neutral-400 bg-neutral-950 border border-white/10 px-1.5 py-0.5 rounded">
                                📍 {item.ubicacion}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-neutral-100 text-sm">{item.nombre}</h4>
                        </div>
                        {getBadgeEstadoStock(item.stockActual, item.stockMinimo)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5 font-mono">
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase font-sans">Stock Disponible</span>
                          <span className="font-bold text-neutral-100 text-sm">{item.stockActual} / {item.stockMinimo} {item.unidadMedida || 'u'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase font-sans">Precio de Venta</span>
                          <span className="font-bold text-emerald-400 text-sm">{currencyFormatter.format(item.precio_venta)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-400 pt-1">
                        <div>Costo Unit: {currencyFormatter.format(item.costo)}</div>
                        <div className="text-emerald-400">Margen: +{currencyFormatter.format(margenUnitario)} ({Math.round(margenPct)}%)</div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                          🏢 {typeof item.proveedor === "string" ? item.proveedor : item.proveedor?.nombre || "Sin Proveedor"}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setHistoryItemId(item.id);
                              setHistoryItemNombre(item.nombre);
                              setOpenHistoryModal(true);
                            }}
                            className="p-2 text-neutral-400 hover:text-blue-400 rounded-xl bg-neutral-950 border border-white/5"
                            title="Ver Historial"
                          >
                            <History className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setStockItem(item);
                              setOpenStockModal(true);
                            }}
                            className="p-2 text-neutral-400 hover:text-emerald-400 rounded-xl bg-neutral-950 border border-white/5"
                            title="Ajustar Stock"
                          >
                            <PackagePlus className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setItemEditar(item);
                              setOpenModal(true);
                            }}
                            className="p-2 text-neutral-400 hover:text-amber-400 rounded-xl bg-neutral-950 border border-white/5"
                            title="Editar Repuesto"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleEliminarDesactivar(item)}
                            className="p-2 text-neutral-400 hover:text-red-400 rounded-xl bg-neutral-950 border border-white/5"
                            title="Desactivar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* VISTA TABLA DESKTOP (>= 768px) */}
              <div className="hidden md:block overflow-x-auto rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-neutral-900/90 text-neutral-400 uppercase tracking-wider text-[10px]">
                      <th className="p-4">Código & Repuesto</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4">Stock Actual / Mínimo</th>
                      <th className="p-4">Costo Unit.</th>
                      <th className="p-4">Precio Venta</th>
                      <th className="p-4">Margen Unit.</th>
                      <th className="p-4">Valorización (Costo / Venta)</th>
                      <th className="p-4">Proveedor</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {itemsFiltrados.map((item, index) => {
                      const margenUnitario = item.precio_venta - item.costo;
                      const margenPct = item.costo > 0 ? (margenUnitario / item.costo) * 100 : 0;
                      const valCosto = item.stockActual * item.costo;
                      const valVenta = item.stockActual * item.precio_venta;

                      return (
                        <tr key={item.id} className="hover:bg-neutral-900/50 transition-colors group">
                          {/* Código & Repuesto */}
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                                {item.codigo}
                              </span>
                              {item.ubicacion && (
                                <span className="text-[10px] text-neutral-400 bg-neutral-900 border border-white/10 px-1.5 py-0.5 rounded">
                                  📍 {item.ubicacion}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-neutral-100 text-sm group-hover:text-red-400 transition-colors">
                              {item.nombre}
                            </p>
                            {item.descripcion && (
                              <p className="text-[11px] text-neutral-500 line-clamp-1">{item.descripcion}</p>
                            )}
                          </td>

                          {/* Categoría */}
                          <td className="p-4">
                            <BadgeDS variant="neutral" className="capitalize">
                              {item.categoria}
                            </BadgeDS>
                          </td>

                          {/* Stock Visual & Mínimo */}
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-neutral-100 text-sm">
                                {item.stockActual} <span className="text-neutral-500 text-xs font-normal">/ {item.stockMinimo} {item.unidadMedida || 'u'}</span>
                              </span>
                              {getBadgeEstadoStock(item.stockActual, item.stockMinimo)}
                            </div>
                          </td>

                          {/* Costo */}
                          <td className="p-4 font-mono text-neutral-300">
                            {currencyFormatter.format(item.costo)}
                          </td>

                          {/* Precio Venta */}
                          <td className="p-4 font-mono font-semibold text-neutral-100">
                            {currencyFormatter.format(item.precio_venta)}
                          </td>

                          {/* Margen Unitario */}
                          <td className="p-4 font-mono">
                            <span className="font-bold text-emerald-400 block">
                              +{currencyFormatter.format(margenUnitario)}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              ({Math.round(margenPct)}%)
                            </span>
                          </td>

                          {/* Valorización */}
                          <td className="p-4 font-mono text-xs space-y-0.5">
                            <span className="text-neutral-300 block">
                              Costo: {currencyFormatter.format(valCosto)}
                            </span>
                            <span className="text-emerald-400 text-[11px] block font-semibold">
                              Venta: {currencyFormatter.format(valVenta)}
                            </span>
                          </td>

                          {/* Proveedor */}
                          <td className="p-4 text-neutral-400">
                            <span className="flex items-center gap-1 text-xs">
                              <Building className="h-3.5 w-3.5 text-neutral-500" />
                              <span>{typeof item.proveedor === "string" ? item.proveedor : item.proveedor?.nombre || "Sin Proveedor"}</span>
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setHistoryItemId(item.id);
                                  setHistoryItemNombre(item.nombre);
                                  setOpenHistoryModal(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-blue-400 rounded-lg hover:bg-white/5 transition-colors"
                                title="Ver Historial de Movimientos"
                              >
                                <History className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setStockItem(item);
                                  setOpenStockModal(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-emerald-400 rounded-lg hover:bg-white/5 transition-colors"
                                title="Registrar Entrada / Ajustar Stock"
                              >
                                <PackagePlus className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setItemEditar(item);
                                  setOpenModal(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors"
                                title="Editar Ficha Técnica"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleEliminarDesactivar(item)}
                                className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                                title="Desactivar Repuesto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL CREAR / EDITAR REPUESTO */}
      <ModalInventario
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onGuardar={handleCrearGuardar}
        itemEditar={itemEditar}
      />

      {/* MODAL AJUSTAR STOCK & MOVIMIENTOS */}
      <StockAdjustmentModal
        isOpen={openStockModal}
        onClose={() => setOpenStockModal(false)}
        item={stockItem}
        onAjustar={handleAjustarStockSubmit}
      />

      {/* MODAL HISTORIAL TRAZABILIDAD MOVIMIENTOS */}
      <MovementHistoryModal
        isOpen={openHistoryModal}
        onClose={() => setOpenHistoryModal(false)}
        itemId={historyItemId}
        itemNombre={historyItemNombre}
      />
    </div>
  );
};

export default InventarioPage;
