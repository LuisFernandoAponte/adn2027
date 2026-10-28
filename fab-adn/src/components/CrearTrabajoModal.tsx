import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Wrench, Car, User, Calendar, Clock, FileText, CheckCircle2, AlertCircle, Loader2, Plus, Search, Tag, DollarSign,
  Camera, Upload, Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { API_BASE } from "@/api/config";
import { getToken } from "@/lib/auth";
import { currencyFormatter } from "@/features/empleado/stateMachine";
import { ImageUploadDropzone } from "@/components/ui/ImageUploadDropzone";

interface CrearTrabajoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrabajoCreado?: () => void;
}

interface MecanicoItem {
  id: string;
  empleado_id?: string;
  nombreCompleto?: string;
  usuario?: { nombreCompleto: string };
  cargo?: string;
}

interface ServicioItem {
  id: string;
  descripcion: string;
  costo: number;
  categoria: string;
}

interface VehiculoCliente {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  kilometraje?: number;
}

interface ClienteItem {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  vehiculos?: VehiculoCliente[];
}

const DEFAULT_SERVICIOS: ServicioItem[] = [
  { id: "serv_1", descripcion: "Mantenimiento Preventivo Completo", costo: 150, categoria: "General" },
  { id: "serv_2", descripcion: "Cambio de Aceite 20W50 y Filtro", costo: 120, categoria: "Lubricación" },
  { id: "serv_3", descripcion: "Diagnóstico Computarizado por Escáner OBD-II", costo: 100, categoria: "Electrónica" },
  { id: "serv_4", descripcion: "Inspección y Cambio de Pastillas de Freno", costo: 180, categoria: "Frenos" },
  { id: "serv_5", descripcion: "Alineación 3D y Balanceo de Llantas", costo: 130, categoria: "Suspensión" },
  { id: "serv_6", descripcion: "Mantenimiento de Sistema Eléctrico y Batería", costo: 200, categoria: "Electricidad" }
];

export const CrearTrabajoModal: React.FC<CrearTrabajoModalProps> = ({
  isOpen,
  onClose,
  onTrabajoCreado
}) => {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Options
  const [mecanicos, setMecanicos] = useState<MecanicoItem[]>([]);
  const [servicios, setServicios] = useState<ServicioItem[]>(DEFAULT_SERVICIOS);
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [fotosUpload, setFotosUpload] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Form State
  const [clienteModo, setClienteModo] = useState<"existente" | "nuevo">("nuevo");
  const [clienteId, setClienteId] = useState<string>("");
  const [nombreCliente, setNombreCliente] = useState<string>("");
  const [telefonoCliente, setTelefonoCliente] = useState<string>("");
  const [emailCliente, setEmailCliente] = useState<string>("");

  const [vehiculoId, setVehiculoId] = useState<string>("");
  const [vehiculoMarca, setVehiculoMarca] = useState<string>("Toyota");
  const [vehiculoModelo, setVehiculoModelo] = useState<string>("Corolla");
  const [vehiculoAnio, setVehiculoAnio] = useState<string>("2022");
  const [vehiculoPlaca, setVehiculoPlaca] = useState<string>("");
  const [kilometraje, setKilometraje] = useState<number>(0);

  const [empleadoId, setEmpleadoId] = useState<string>("");
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([DEFAULT_SERVICIOS[0].id]);
  const [fechaCita, setFechaCita] = useState<string>(new Date().toISOString().split("T")[0]);
  const [horaInicio, setHoraInicio] = useState<string>("09:00");
  const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState<string>(new Date().toISOString().split("T")[0]);
  
  const [diagnostico, setDiagnostico] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [descuento, setDescuento] = useState<number>(0);
  const [estadoInicial, setEstadoInicial] = useState<string>("En taller");

  // Precios personalizados por servicio (criterio según el vehículo/trabajo)
  const [preciosPersonalizados, setPreciosPersonalizados] = useState<Record<string, number>>({});
  const [mostrarAgregarCustom, setMostrarAgregarCustom] = useState(false);
  const [customNombre, setCustomNombre] = useState("");
  const [customCosto, setCustomCosto] = useState<number>(0);

  // Obtener cliente seleccionado y sus vehículos asociados exclusivamente
  const clienteSeleccionadoObj = useMemo(() => {
    return clientes.find((c) => c.id === clienteId);
  }, [clientes, clienteId]);

  const vehiculosDelCliente = useMemo(() => {
    return clienteSeleccionadoObj?.vehiculos || [];
  }, [clienteSeleccionadoObj]);

  useEffect(() => {
    if (!isOpen) return;

    const cargarOpciones = async () => {
      setLoadingOptions(true);
      setErrorMsg(null);
      try {
        const token = getToken();
        // Cargar Mecánicos
        const resM = await axios.get(`${API_BASE}/api/cliente/empleados-disponibles`);
        if (resM.data.success && resM.data.empleados) {
          const listM = resM.data.empleados.map((m: any) => ({
            id: m.empleado_id || m.id,
            nombreCompleto: m.nombre_completo || m.usuario?.nombreCompleto || "Mecánico",
            cargo: m.cargo || "Mecánico Taller"
          }));
          setMecanicos(listM);
          if (listM.length > 0) setEmpleadoId(listM[0].id);
        }

        // Cargar Servicios de la BD o Fallback
        try {
          const resS = await axios.get(`${API_BASE}/api/servicios`);
          const raw = resS.data;
          const listS = Array.isArray(raw) ? raw : (raw.servicios || raw.data || []);
          if (listS.length > 0) {
            setServicios(listS);
            setServiciosSeleccionados([listS[0].id]);
          } else {
            setServicios(DEFAULT_SERVICIOS);
            setServiciosSeleccionados([DEFAULT_SERVICIOS[0].id]);
          }
        } catch (e) {
          console.warn("Servicios endpoint fallback a catálogo predeterminado:", e);
          setServicios(DEFAULT_SERVICIOS);
          setServiciosSeleccionados([DEFAULT_SERVICIOS[0].id]);
        }

        // Cargar Clientes con sus Vehículos asociados
        if (token) {
          const resC = await axios.get(`${API_BASE}/api/cliente/buscar?q=a`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resC.data && Array.isArray(resC.data.clientes)) {
            setClientes(resC.data.clientes);
          }
        }
      } catch (err) {
        console.warn("Carga opciones warning:", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    cargarOpciones();
  }, [isOpen]);

  // Al seleccionar un vehículo existente del cliente
  const handleSelectVehiculoExistente = (vId: string) => {
    setVehiculoId(vId);
    const v = vehiculosDelCliente.find((veh) => veh.id === vId);
    if (v) {
      setVehiculoMarca(v.marca);
      setVehiculoModelo(v.modelo || "");
      setVehiculoAnio(String(v.anio || 2022));
      setVehiculoPlaca(v.placa);
      setKilometraje(v.kilometraje || 0);
    }
  };

  const toggleServicio = (id: string, defaultCosto: number) => {
    setServiciosSeleccionados((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((item) => item !== id);
      } else {
        if (preciosPersonalizados[id] === undefined) {
          setPreciosPersonalizados((prevP) => ({ ...prevP, [id]: defaultCosto }));
        }
        return [...prev, id];
      }
    });
  };

  const handleAgregarCustomServicio = () => {
    if (!customNombre.trim()) return;
    const newId = `custom_serv_${Date.now()}`;
    const nuevoServicio: ServicioItem = {
      id: newId,
      descripcion: customNombre.trim(),
      costo: customCosto || 0,
      categoria: "Personalizado"
    };
    setServicios((prev) => [...prev, nuevoServicio]);
    setServiciosSeleccionados((prev) => [...prev, newId]);
    setPreciosPersonalizados((prev) => ({ ...prev, [newId]: customCosto || 0 }));
    setCustomNombre("");
    setCustomCosto(0);
    setMostrarAgregarCustom(false);
  };

  // Cálculos Automáticos de Monto usando Precios Personalizados
  const subtotalServicios = useMemo(() => {
    return servicios
      .filter((s) => serviciosSeleccionados.includes(s.id))
      .reduce((acc, s) => {
        const customPrice = preciosPersonalizados[s.id];
        const priceToUse = customPrice !== undefined ? customPrice : Number(s.costo);
        return acc + priceToUse;
      }, 0);
  }, [servicios, serviciosSeleccionados, preciosPersonalizados]);

  const totalCalculado = useMemo(() => {
    return Math.max(0, subtotalServicios - Number(descuento || 0));
  }, [subtotalServicios, descuento]);

  const handleCrearOrden = async () => {
    if (!empleadoId) {
      setErrorMsg("Debes seleccionar un mecánico responsable para el trabajo");
      return;
    }
    if (!vehiculoPlaca.trim()) {
      setErrorMsg("Ingresa la placa del vehículo que ingresa al taller");
      return;
    }
    if (!diagnostico.trim() && !observaciones.trim()) {
      setErrorMsg("Ingresa el diagnóstico inicial o motivo de ingreso del vehículo");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const token = getToken();
      const payload = {
        clienteId: clienteModo === "existente" ? clienteId : undefined,
        nombreCliente: clienteModo === "nuevo" ? nombreCliente : undefined,
        telefonoCliente: clienteModo === "nuevo" ? telefonoCliente : undefined,
        emailCliente: clienteModo === "nuevo" ? emailCliente : undefined,
        vehiculoPlaca: vehiculoPlaca.toUpperCase().trim(),
        vehiculoMarca,
        vehiculoModelo,
        vehiculoAnio,
        kilometraje: Number(kilometraje || 0),
        empleadoId,
        serviciosIds: serviciosSeleccionados,
        fechaCita,
        horaInicio,
        fechaEstimadaEntrega,
        diagnostico,
        observaciones,
        descuento: Number(descuento || 0),
        estado: estadoInicial,
        fotos: fotosUpload
      };

      const res = await axios.post(`${API_BASE}/api/citas/admin/citas`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        onClose();
        if (onTrabajoCreado) onTrabajoCreado();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Error al registrar la orden de trabajo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl bg-neutral-900 border-white/10 text-neutral-100 shadow-2xl overflow-y-auto max-h-[94dvh] sm:max-h-[90vh] p-4 sm:p-6 rounded-2xl touch-scroll safe-area-bottom">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-neutral-100">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Wrench className="h-5 w-5" />
            </div>
            Registrar Nueva Orden de Trabajo (OT)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. SECCIÓN CLIENTE */}
          <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-white/5">
            <div className="flex items-center justify-between">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <User className="h-4 w-4 text-red-400" />
                <span>1. Datos del Cliente / Propietario</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClienteModo("nuevo")}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    clienteModo === "nuevo"
                      ? "bg-red-500/20 text-red-300 border-red-500/30 font-semibold"
                      : "bg-neutral-900 text-neutral-400 border-white/5"
                  }`}
                >
                  + Nuevo Cliente
                </button>
                {clientes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClienteModo("existente")}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      clienteModo === "existente"
                        ? "bg-red-500/20 text-red-300 border-red-500/30 font-semibold"
                        : "bg-neutral-900 text-neutral-400 border-white/5"
                    }`}
                  >
                    Buscar Registrado
                  </button>
                )}
              </div>
            </div>

            {clienteModo === "existente" ? (
              <div>
                <select
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setVehiculoId("");
                  }}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecciona cliente registrado...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.telefono || c.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="Ej: Ana Rodríguez"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Teléfono Contacto</label>
                  <input
                    type="tel"
                    placeholder="70000000"
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Email Opcional</label>
                  <input
                    type="email"
                    placeholder="ana@gmail.com"
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. SECCIÓN VEHÍCULO (FILTRADO POR CLIENTE) */}
          <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-white/5">
            <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
              <Car className="h-4 w-4 text-purple-400" />
              <span>2. Vehículo que Ingresa al Taller</span>
            </label>

            {clienteModo === "existente" && vehiculosDelCliente.length > 0 && (
              <div className="mb-2">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Seleccionar de los Vehículos del Cliente</label>
                <select
                  value={vehiculoId}
                  onChange={(e) => handleSelectVehiculoExistente(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Ingresar datos de vehículo manualmente --</option>
                  {vehiculosDelCliente.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚗 {v.marca} {v.modelo} ({v.anio}) - Placa: {v.placa}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Marca *</label>
                <input
                  type="text"
                  placeholder="Ej: Toyota"
                  value={vehiculoMarca}
                  onChange={(e) => setVehiculoMarca(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Modelo</label>
                <input
                  type="text"
                  placeholder="Ej: Corolla"
                  value={vehiculoModelo}
                  onChange={(e) => setVehiculoModelo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Año</label>
                <input
                  type="number"
                  placeholder="2022"
                  value={vehiculoAnio}
                  onChange={(e) => setVehiculoAnio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Placa *</label>
                <input
                  type="text"
                  placeholder="4521-XYZ"
                  value={vehiculoPlaca}
                  onChange={(e) => setVehiculoPlaca(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase block mb-1">Kilometraje *</label>
                <input
                  type="number"
                  placeholder="45000"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* 3. DIAGNÓSTICO INICIAL Y OBSERVACIONES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-1.5">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <FileText className="h-4 w-4 text-amber-400" />
                <span>3. Diagnóstico Inicial Técnico *</span>
              </label>
              <textarea
                rows={3}
                placeholder="Diagnóstico técnico del especialista (ej: Ruido metálico al frenar, desgaste severo de pastillas)..."
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-1.5">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <Tag className="h-4 w-4 text-neutral-400" />
                <span>Observaciones del Cliente</span>
              </label>
              <textarea
                rows={3}
                placeholder="Observaciones adicionales, estado estético del auto al ingresar, pertenencias dejadas en maletera..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* 4. MECÁNICO RESPONSABLE Y FECHA ESTIMADA DE ENTREGA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-1.5">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <Wrench className="h-4 w-4 text-blue-400" />
                <span>4. Mecánico Responsable *</span>
              </label>
              <select
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {mecanicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    👨‍🔧 {m.nombreCompleto} ({m.cargo})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-1.5">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>5. Fecha Estimada Entrega</span>
              </label>
              <input
                type="date"
                value={fechaEstimadaEntrega}
                onChange={(e) => setFechaEstimadaEntrega(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-1.5">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <Clock className="h-4 w-4 text-purple-400" />
                <span>6. Estado Inicial OT</span>
              </label>
              <select
                value={estadoInicial}
                onChange={(e) => setEstadoInicial(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="En taller">🚗 En Taller (Recepción oficial)</option>
                <option value="En progreso">🛠️ En Progreso (En reparación)</option>
                <option value="Agendado">📅 Agendado (Reserva previa)</option>
              </select>
            </div>
          </div>

          {/* 5. SELECCIÓN DE SERVICIOS Y CÁLCULO ECONÓMICO PERSONALIZABLE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>7. Selección Múltiple de Servicios (Precios Personalizables)</span>
                </label>
                <span className="text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-white/5 font-mono">
                  *Ajustable según el vehículo
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {servicios.map((s) => {
                  const isSelected = serviciosSeleccionados.includes(s.id);
                  const precioActual = preciosPersonalizados[s.id] !== undefined ? preciosPersonalizados[s.id] : s.costo;

                  return (
                    <div
                      key={s.id}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col gap-2 transition-colors ${
                        isSelected
                          ? "bg-red-500/10 border-red-500/30 text-neutral-100"
                          : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <div
                        onClick={() => toggleServicio(s.id, s.costo)}
                        className="flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded accent-red-500 cursor-pointer h-4 w-4"
                          />
                          <span className="font-semibold text-neutral-200">{s.descripcion}</span>
                        </div>
                        <span className="font-mono text-[11px] text-neutral-400">
                          Estándar: Bs. {s.costo}
                        </span>
                      </div>

                      {/* Input de costo editable para el vehículo específico */}
                      {isSelected && (
                        <div className="flex items-center justify-between pt-2 border-t border-red-500/20 bg-neutral-950/70 p-2 rounded-lg mt-0.5">
                          <span className="text-[11px] text-red-300 font-semibold flex items-center gap-1">
                            <span>✏️ Costo para este trabajo (Bs.):</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono font-bold text-neutral-400">Bs.</span>
                            <input
                              type="number"
                              min={0}
                              value={precioActual}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                setPreciosPersonalizados((prev) => ({ ...prev, [s.id]: newPrice }));
                              }}
                              className="w-24 rounded-md bg-neutral-900 border border-red-500/40 px-2 py-1 text-xs text-red-400 font-mono font-bold text-right focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botón para añadir trabajo ad-hoc no listado */}
              <div className="pt-2 border-t border-white/10">
                {!mostrarAgregarCustom ? (
                  <button
                    type="button"
                    onClick={() => setMostrarAgregarCustom(true)}
                    className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Agregar Servicio Especial / Trabajo Personalizado</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-red-500/30 space-y-2">
                    <div className="text-[11px] font-bold text-neutral-200">Añadir Nuevo Trabajo Especial</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Descripción del trabajo (ej. Rectificación de disco)"
                        value={customNombre}
                        onChange={(e) => setCustomNombre(e.target.value)}
                        className="sm:col-span-2 rounded-lg bg-neutral-950 border border-white/10 px-2.5 py-1.5 text-xs text-neutral-100"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-neutral-400">Bs.</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Costo"
                          value={customCosto || ""}
                          onChange={(e) => setCustomCosto(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg bg-neutral-950 border border-white/10 px-2.5 py-1.5 text-xs text-neutral-100 font-mono font-bold text-right"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMostrarAgregarCustom(false)}
                        className="px-2.5 py-1 bg-neutral-800 text-neutral-300 rounded text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAgregarCustomServicio}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                      >
                        Añadir a la Orden
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen de Cálculo Automático */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2 flex flex-col justify-between">
              <label className={DESIGN_TOKENS.colors.label + " flex items-center gap-1.5"}>
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span>Cálculos Automáticos (Bs.)</span>
              </label>
              <div className="space-y-1.5 text-xs text-neutral-400">
                <div className="flex justify-between">
                  <span>Subtotal Servicios:</span>
                  <span className="font-mono text-neutral-200">{currencyFormatter.format(subtotalServicios)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span>Descuento (Bs.):</span>
                  <input
                    type="number"
                    min={0}
                    value={descuento}
                    onChange={(e) => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 rounded-lg border border-white/10 bg-neutral-900 px-2 py-0.5 text-right text-xs text-neutral-100 font-mono"
                  />
                </div>
                <div className="flex justify-between font-bold text-neutral-100 pt-2 border-t border-white/10">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="font-mono text-red-400 text-sm">{currencyFormatter.format(totalCalculado)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. ADJUNTAR FOTO INICIAL DE RECEPCIÓN (OPCIONAL - CLOUDINARY) */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5">
            <ImageUploadDropzone
              photos={fotosUpload}
              onChange={setFotosUpload}
              maxFiles={6}
              label="8. Fotografías de Recepción del Auto (Check-in)"
              description="Fotos del estado inicial, rayones, placa u odómetro. Compresión WebP HD automática."
            />
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <ButtonDS variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </ButtonDS>
          <ButtonDS
            variant="primary"
            isLoading={submitting}
            onClick={handleCrearOrden}
            icon={<Plus className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            Registrar Orden de Trabajo (OT)
          </ButtonDS>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
