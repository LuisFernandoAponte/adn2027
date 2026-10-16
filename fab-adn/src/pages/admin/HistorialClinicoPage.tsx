import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Car, Search, Wrench, Calendar, ShieldCheck, Clock, DollarSign,
  TrendingUp, User, Phone, Printer, ArrowLeft, AlertCircle, RefreshCw,
  CheckCircle2, Sparkles, MessageCircle, FileText, ChevronRight, Package, Camera
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, AreaChart, Area
} from "recharts";
import { Navbar } from "@/components/ui/Navbar";
import { CardDS } from "@/components/ui/DesignSystem";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { useToast } from "@/hooks/use-toast";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { currencyFormatter, dateFormatter } from "@/features/empleado/stateMachine";
import {
  obtenerHistorialClinico,
  obtenerVehiculos,
  type HistorialClinicoResponse,
  type VehiculoItem,
  type VisitaHistorial
} from "@/api/vehiculoApi";
import { ModalWhatsAppNotificacion } from "@/components/admin/ModalWhatsAppNotificacion";

const DEFAULT_PLACAS = [
  { id: "1", placa: "4829-KLS", marca: "Toyota Hilux" },
  { id: "2", placa: "3921-XYZ", marca: "Nissan Frontier" },
  { id: "3", placa: "5102-ABC", marca: "Suzuki Vitara" },
  { id: "4", placa: "2841-MNO", marca: "Mitsubishi L200" },
  { id: "5", placa: "6039-PQR", marca: "Ford Raptor" },
];

export const HistorialClinicoPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [placaBusqueda, setPlacaBusqueda] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<HistorialClinicoResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lista de vehículos para sugerencias de placa
  const [vehiculosList, setVehiculosList] = useState<VehiculoItem[]>([]);

  // Modal WhatsApp
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false);
  const [whatsAppProps, setWhatsAppProps] = useState<any>({});

  // Cargar lista de vehículos registrados para sugerencias
  useEffect(() => {
    obtenerVehiculos()
      .then((res) => setVehiculosList(res))
      .catch((err) => console.warn("No se pudieron cargar vehículos para sugerencias:", err));
  }, []);

  // Buscar historial clínico
  const buscarHistorial = async (placa: string) => {
    const cleanPlaca = placa.trim().toUpperCase();
    if (!cleanPlaca) {
      toast({
        title: "Ingresa una Placa",
        description: "Escribe la placa del vehículo (ej: 4829-KLS).",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSearchParams({ placa: cleanPlaca });

      const res = await obtenerHistorialClinico(cleanPlaca);
      setData(res);
      setPlacaBusqueda(cleanPlaca);
    } catch (err: any) {
      const msg = err.response?.data?.error || `No se encontraron registros para la placa ${cleanPlaca}`;
      setErrorMsg(msg);
      setData(null);
      toast({
        title: "Búsqueda sin resultados",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Leer parámetro URL si existe
  useEffect(() => {
    const p = searchParams.get("placa");
    if (p) {
      setPlacaBusqueda(p);
      buscarHistorial(p);
    } else {
      // Buscar la primera placa por defecto para mostrar datos
      buscarHistorial("4829-KLS");
    }
  }, [searchParams]);

  const handleOpenWhatsAppVisita = (visita: VisitaHistorial) => {
    if (!data) return;
    setWhatsAppProps({
      clienteNombre: data.vehiculo.cliente,
      clienteTelefono: data.vehiculo.telefono,
      vehiculo: `${data.vehiculo.marca} ${data.vehiculo.modelo}`,
      placa: data.vehiculo.placa,
      codigoOT: `OT-${visita.id.substring(0, 5).toUpperCase()}`,
      total: visita.costo_total,
      servicio: visita.servicios.map((s) => s.nombre).join(", "),
      templateDefault: visita.garantia.activa ? "garantia" : "listo",
    });
    setModalWhatsAppOpen(true);
  };

  const formattedCurvaKm = useMemo(() => {
    if (!data?.curva_kilometraje) return [];
    return data.curva_kilometraje.map((item, idx) => {
      const d = item.fecha ? new Date(item.fecha) : new Date();
      return {
        ...item,
        fechaLabel: d.toLocaleDateString("es-BO", { day: "numeric", month: "short" }),
        fechaCompleta: d.toLocaleDateString("es-BO", { dateStyle: "medium" }),
        km: Number(item.kilometraje || 0),
      };
    });
  }, [data]);

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-24`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* ENCABEZADO Y BUSCADOR UNIVERSAL */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin/trabajos")}
                className="p-1.5 rounded-lg bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Volver a Órdenes de Trabajo"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
                <Car className="h-7 w-7 text-red-500" />
                <span>Historial Clínico del Vehículo ("Carfax del Taller")</span>
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Trazabilidad técnica completa: visitas, kilometraje, repuestos instalados y garantías oficiales vigentes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
              disabled={!data}
            >
              Imprimir Ficha
            </ButtonDS>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA POR PLACA */}
        <div className="mt-6 p-4 rounded-3xl bg-neutral-900 border border-white/10 shadow-xl space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscarHistorial(placaBusqueda);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Ingresa la placa del vehículo (ej: 4829-KLS, 3921-XYZ)..."
                value={placaBusqueda}
                onChange={(e) => setPlacaBusqueda(e.target.value.toUpperCase())}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-neutral-950 border border-white/10 text-sm font-mono text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500 tracking-wider font-bold"
              />
            </div>

            <ButtonDS
              variant="primary"
              icon={<Search className="h-4 w-4" />}
              type="submit"
              disabled={loading}
              className="py-3 px-6 text-sm"
            >
              {loading ? "Buscando..." : "Consultar Historial"}
            </ButtonDS>
          </form>


          {/* Sugerencias Rápidas de Placas de la Base de Datos */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs text-neutral-400">
            <span className="font-semibold text-[11px] text-neutral-500">Placas del taller:</span>
            {(vehiculosList.length > 0 ? vehiculosList : DEFAULT_PLACAS).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setPlacaBusqueda(v.placa);
                  buscarHistorial(v.placa);
                }}
                className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs transition-all ${
                  data?.vehiculo?.placa === v.placa
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-white/5"
                }`}
              >
                {v.placa} ({v.marca})
              </button>
            ))}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL DEL HISTORIAL */}
        {loading ? (
          <div className="pt-8 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-red-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">Cargando expediente clínico del vehículo...</p>
          </div>
        ) : errorMsg ? (
          <div className="mt-8 p-12 text-center rounded-3xl bg-neutral-900 border border-white/5 space-y-3">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-neutral-200">Sin Expediente Encontrado</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">{errorMsg}</p>
          </div>
        ) : data ? (
          <div className="mt-6 space-y-6">
            {/* 1. FICHA TÉCNICA DEL AUTO & PROPIETARIO */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Placa & Modelo */}
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 font-mono text-2xl font-black tracking-widest shadow-inner shadow-amber-500/10">
                    {data.vehiculo.placa}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      Expediente Clínico Automotriz
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-neutral-100 flex items-center gap-2">
                      <span>{data.vehiculo.marca} {data.vehiculo.modelo}</span>
                      <span className="text-xs font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                        {data.vehiculo.anio}
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Último Kilometraje Registrado: <strong className="text-neutral-200 font-mono font-bold">{data.vehiculo.ultimo_kilometraje.toLocaleString("es-BO")} km</strong>
                    </p>
                  </div>
                </div>

                {/* Propietario & Botón WhatsApp Directo */}
                <div className="flex items-center gap-4 bg-neutral-950/80 p-3.5 rounded-2xl border border-white/5">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-neutral-300">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <span className="text-[10px] text-neutral-500 block uppercase font-bold">Propietario</span>
                    <p className="font-bold text-neutral-100 text-sm">{data.vehiculo.cliente}</p>
                    <p className="text-neutral-400 font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3 text-neutral-500" />
                      <span>{data.vehiculo.telefono}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setWhatsAppProps({
                        clienteNombre: data.vehiculo.cliente,
                        clienteTelefono: data.vehiculo.telefono,
                        vehiculo: `${data.vehiculo.marca} ${data.vehiculo.modelo}`,
                        placa: data.vehiculo.placa,
                        codigoOT: "CONSULTA",
                        total: data.resumen_clinico.total_invertido_bob,
                        servicio: "Atención al Cliente ADN",
                        templateDefault: "garantia",
                      });
                      setModalWhatsAppOpen(true);
                    }}
                    className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="Enviar WhatsApp al Cliente"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Métricas Resumen Clínico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10 text-xs">
                <div className="bg-neutral-950/60 p-3 rounded-2xl border border-white/5 space-y-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase font-bold">Visitas Totales</span>
                  <p className="text-xl font-black text-neutral-100 font-mono">{data.resumen_clinico.total_visitas}</p>
                  <p className="text-[10px] text-neutral-400">Ingresos a taller</p>
                </div>

                <div className="bg-neutral-950/60 p-3 rounded-2xl border border-white/5 space-y-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase font-bold">Inversión Acumulada</span>
                  <p className="text-xl font-black text-emerald-400 font-mono">
                    {currencyFormatter.format(data.resumen_clinico.total_invertido_bob)}
                  </p>
                  <p className="text-[10px] text-neutral-400">Total pagado en reparaciones</p>
                </div>

                <div className="bg-neutral-950/60 p-3 rounded-2xl border border-white/5 space-y-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase font-bold">Garantías Vigentes</span>
                  <p className="text-xl font-black text-purple-400 font-mono">
                    {data.resumen_clinico.garantias_activas_count}
                  </p>
                  <p className="text-[10px] text-neutral-400">Trabajos bajo cobertura</p>
                </div>

                <div className="bg-neutral-950/60 p-3 rounded-2xl border border-white/5 space-y-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase font-bold">Próximo Service Aceite</span>
                  <p className="text-xl font-black text-amber-400 font-mono">
                    {data.mantenimiento_predictivo.proximo_cambio_aceite_km.toLocaleString()} km
                  </p>
                  <p className="text-[10px] text-neutral-400">{data.mantenimiento_predictivo.intervalo_sugerido}</p>
                </div>
              </div>
            </div>

            {/* 2. GRÁFICA DE EVOLUCIÓN DE KILOMETRAJE */}
            {formattedCurvaKm.length > 0 && (
              <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Evolución de Kilometraje del Vehículo
                    </h3>
                    <p className="text-xs text-neutral-400">Registro histórico de kilometraje en cada ingreso al taller</p>
                  </div>
                </div>

                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedCurvaKm} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="curvaKmGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="fechaLabel" stroke="#737373" tick={{ fill: "#a3a3a3", fontSize: 10 }} />
                      <YAxis stroke="#737373" tick={{ fill: "#a3a3a3", fontSize: 10 }} tickFormatter={(v) => `${v}k`} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-neutral-900 border border-white/10 p-2.5 rounded-xl shadow-xl font-mono text-xs">
                                <span className="text-neutral-400 block text-[10px]">{item.fechaCompleta}</span>
                                <span className="text-blue-400 font-bold text-sm block mt-0.5">
                                  {item.km.toLocaleString()} km
                                </span>
                                <span className="text-neutral-300 font-sans text-[11px] block mt-1">
                                  {item.diagnostico_breve}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="km" stroke="#3b82f6" strokeWidth={2.5} fill="url(#curvaKmGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. SECCIÓN DE GARANTÍAS OFICIALES ACTIVAS */}
            {data.garantias_vigentes && data.garantias_vigentes.length > 0 && (
              <div className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/30 space-y-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                    Garantías Oficiales Vigentes ({data.garantias_vigentes.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.garantias_vigentes.map((g, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono">
                          {g.dias_restantes} días de garantía restantes
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold text-[10px] uppercase">
                          Vigente
                        </span>
                      </div>
                      <p className="text-neutral-200 font-semibold">{g.servicios.join(", ")}</p>
                      <p className="text-[11px] text-neutral-500">{g.cobertura}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. LÍNEA DE VIDA CRONOLÓGICA (TIMELINE) */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-500" />
                Historial Cronológico de Reparaciones y Servicios
              </h3>

              <div className="space-y-4">
                {data.historial_visitas.map((visita, idx) => (
                  <div
                    key={visita.id}
                    className="p-5 rounded-3xl bg-neutral-900 border border-white/5 hover:border-white/20 transition-all space-y-3"
                  >
                    {/* Header de la Visita */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-xl bg-neutral-950 border border-white/10 font-mono text-xs font-bold text-red-400">
                          Visita #{data.historial_visitas.length - idx}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">
                          {visita.fecha ? new Date(visita.fecha).toLocaleDateString("es-BO", { dateStyle: "long" }) : "Fecha registrada"}
                        </span>
                        <span className="text-xs font-mono text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded-lg border border-white/5">
                          {visita.kilometraje.toLocaleString()} km
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <BadgeDS variant="emerald">{visita.estado}</BadgeDS>
                        <button
                          onClick={() => handleOpenWhatsAppVisita(visita)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1 transition-all"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Diagnóstico y Técnico */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="md:col-span-2 bg-neutral-950/60 p-3 rounded-2xl border border-white/5 space-y-1">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Diagnóstico & Tareas Realizadas</span>
                        <p className="text-neutral-200">{visita.diagnostico}</p>
                      </div>

                      <div className="bg-neutral-950/60 p-3 rounded-2xl border border-white/5 space-y-1">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Mecánico Responsable</span>
                        <p className="text-neutral-100 font-semibold">{visita.mecanico}</p>
                        <p className="text-emerald-400 font-mono font-bold text-sm">
                          Total: {currencyFormatter.format(visita.costo_total)}
                        </p>
                      </div>
                    </div>

                    {/* Servicios & Repuestos Detallados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      {visita.servicios.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                            🛠️ Mano de Obra & Servicios
                          </span>
                          <div className="space-y-1">
                            {visita.servicios.map((s) => (
                              <div key={s.id} className="p-2 rounded-xl bg-neutral-950 border border-white/5 flex justify-between">
                                <span className="text-neutral-300">{s.nombre}</span>
                                <span className="font-mono text-neutral-400 font-bold">{currencyFormatter.format(s.costo)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {visita.repuestos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                            📦 Repuestos Instalados
                          </span>
                          <div className="space-y-1">
                            {visita.repuestos.map((r) => (
                              <div key={r.id} className="p-2 rounded-xl bg-neutral-950 border border-white/5 flex justify-between">
                                <span className="text-neutral-300">{r.cantidad}x {r.nombre}</span>
                                <span className="font-mono text-purple-400 font-bold">{currencyFormatter.format(r.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* MODAL DE WHATSAPP NOTIFICACIÓN */}
      <ModalWhatsAppNotificacion
        open={modalWhatsAppOpen}
        onClose={() => setModalWhatsAppOpen(false)}
        {...whatsAppProps}
      />
    </div>
  );
};

export default HistorialClinicoPage;
