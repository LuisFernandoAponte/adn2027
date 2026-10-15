import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarPlus, ClipboardList, Car, Phone, Plus, Trash2, Clock, CheckCircle2,
  FileText, ShieldCheck, Loader2, Sparkles, AlertTriangle
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { CardDS, StatCard, ActionCard, SectionHeader } from "@/components/ui/DesignSystem";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { EmptyState } from "@/components/ui/EmptyState";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import AgendarCitaModal from "@/components/AgendarCitaModal";
import { obtenerMisCitas, type Trabajo } from "@/api/citaApi";
import { API_BASE } from "@/api/config";
import { getUser, getToken } from "@/lib/auth";
import axios from "axios";

interface VehiculoItem {
  id: string;
  marca: string;
  modelo: string | null;
  anio: number | null;
  placa: string;
}

interface EmpleadoItem {
  empleado_id: string;
  nombre_completo: string;
  cargo: string;
  telefono?: string;
  email?: string;
}

const PRESETS_AUTOS = [
  { marca: "Toyota", modelo: "Corolla", anio: 2022, placa: "4521-XYZ" },
  { marca: "Nissan", modelo: "Kicks", anio: 2023, placa: "3892-ABC" },
  { marca: "Suzuki", modelo: "Vitara", anio: 2021, placa: "5102-LMN" },
  { marca: "Hyundai", modelo: "Tucson", anio: 2024, placa: "6234-PQR" },
];

const getEstadoBadgeVariant = (estado: string | null) => {
  const est = estado || "Agendado";
  switch (est) {
    case "Completado":
    case "Entregado":
      return "emerald";
    case "En taller":
    case "En revisión":
    case "En progreso":
      return "amber";
    case "Cancelado":
      return "red";
    case "Agendado":
    default:
      return "blue";
  }
};

const ClienteHome: React.FC = () => {
  const navigate = useNavigate();
  const user = getUser();

  const [showModal, setShowModal] = useState(false);
  const [citas, setCitas] = useState<Trabajo[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>([]);
  const [mecanicos, setMecanicos] = useState<EmpleadoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Vehículo
  const [modalVehiculoOpen, setModalVehiculoOpen] = useState(false);
  const [newVehiculo, setNewVehiculo] = useState({ marca: "", modelo: "", anio: "", placa: "" });
  const [savingVehiculo, setSavingVehiculo] = useState(false);
  const [vehiculoError, setVehiculoError] = useState<string | null>(null);

  // Modal Auxilio Mecánico 24/7
  const [modalAuxilioOpen, setModalAuxilioOpen] = useState(false);
  const [auxilioForm, setAuxilioForm] = useState({
    tipoEmergencia: "Fallo de Motor / Grúa requerida",
    ubicacion: "Av. Principal esq. Calle 5 (Santa Cruz)",
    vehiculoPlaca: "",
    telefonoContacto: user?.telefono || "70000000",
  });
  const [sendingAuxilio, setSendingAuxilio] = useState(false);

  const cargarDatosCliente = async () => {
    try {
      setLoading(true);
      const token = getToken();

      // Cargar Citas
      try {
        const citasData = await obtenerMisCitas();
        setCitas(citasData);
      } catch (e) {
        setCitas([]);
      }

      // Cargar Vehículos
      try {
        if (token) {
          const resV = await axios.get(`${API_BASE}/api/cliente/vehiculos`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resV.data.success) {
            setVehiculos(resV.data.vehiculos || []);
          }
        }
      } catch (e) {
        setVehiculos([]);
      }

      // Cargar Mecánicos
      try {
        const resM = await axios.get(`${API_BASE}/api/cliente/empleados-disponibles`);
        if (resM.data.success) {
          setMecanicos(resM.data.empleados || []);
        }
      } catch (e) {
        setMecanicos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosCliente();
  }, []);

  const handleGuardarVehiculo = async (preset?: typeof PRESETS_AUTOS[0]) => {
    const dataToSend = preset
      ? { ...preset, anio: String(preset.anio) }
      : newVehiculo;

    if (!dataToSend.marca || !dataToSend.placa) {
      setVehiculoError("La marca y la placa son obligatorias");
      return;
    }

    setSavingVehiculo(true);
    setVehiculoError(null);
    try {
      const token = getToken();
      const res = await axios.post(`${API_BASE}/api/cliente/vehiculos`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setNewVehiculo({ marca: "", modelo: "", anio: "", placa: "" });
        setModalVehiculoOpen(false);
        cargarDatosCliente();
      }
    } catch (err: any) {
      setVehiculoError(err.response?.data?.error || "Error al registrar vehículo");
    } finally {
      setSavingVehiculo(false);
    }
  };

  const handleEliminarVehiculo = async (id: string) => {
    if (!confirm("¿Deseas eliminar este vehículo de tu garaje?")) return;
    try {
      const token = getToken();
      await axios.delete(`${API_BASE}/api/cliente/vehiculos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      cargarDatosCliente();
    } catch (err: any) {
      alert("No se pudo eliminar el vehículo");
    }
  };

  const citasActivas = citas.filter(
    (c) => c.estado !== "Entregado" && c.estado !== "Cancelado"
  );
  const citaEnProgreso = citasActivas[0];
  const serviciosRealizadosCount = citas.filter((c) => c.estado === "Entregado" || c.estado === "Completado").length;

  const getNombreCliente = () => {
    if (user?.nombreCompleto) return user.nombreCompleto;
    if (user?.nombre_completo) return user.nombre_completo;
    return "Cliente VIP";
  };

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-16`}>
      {/* ── SHARED NAVBAR ── */}
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* ── HERO BANNER VIP ── */}
        <CardDS hoverEffect={false} className="relative overflow-hidden border-white/10 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <BadgeDS variant="vip" icon={<Sparkles className="h-3.5 w-3.5" />}>
                  Portal del Cliente VIP
                </BadgeDS>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-100">
                ¡Hola, <span className="text-red-500">{getNombreCliente()}</span>!
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Bienvenido a tu panel de control vehicular. Sigue reparaciones en vivo, solicita auxilio mecánico 24/7 y gestiona tu garaje.
              </p>
            </div>

            <ButtonDS
              variant="primary"
              icon={<CalendarPlus className="h-4 w-4" />}
              onClick={() => setShowModal(true)}
            >
              Agendar Servicio Técnico
            </ButtonDS>
          </div>
        </CardDS>

        {/* ── STATS CARDS (GRID 3 COLUMNAS) ── */}
        <section aria-label="Estadísticas generales">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Citas Activas"
              value={citasActivas.length}
              subtitle={citasActivas.length > 0 ? "Vehículos en taller o agendados" : "Sin vehículos en taller"}
              icon={<Clock className="h-6 w-6" />}
              variant="amber"
            />
            <StatCard
              title="Mi Garaje"
              value={vehiculos.length}
              subtitle={vehiculos.length > 0 ? `${vehiculos.length} autos registrados` : "Sin autos registrados"}
              icon={<Car className="h-6 w-6" />}
              variant="purple"
            />
            <StatCard
              title="Servicios Realizados"
              value={serviciosRealizadosCount}
              subtitle="Mantenimientos completados"
              icon={<ShieldCheck className="h-6 w-6" />}
              variant="emerald"
            />
          </div>
        </section>

        {/* ── ESTADO EN VIVO DE VEHÍCULO EN TALLER ── */}
        {citaEnProgreso && (
          <CardDS className="border-red-900/40 bg-gradient-to-r from-neutral-900 via-neutral-900 to-red-950/30 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className={DESIGN_TOKENS.colors.label}>Monitoreo en Vivo</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Car className="h-5 w-5 text-red-500" />
                  Reparación Activa: Cita #{citaEnProgreso.id ? String(citaEnProgreso.id).substring(0, 8) : "N/A"}
                </h3>
                <p className="text-xs text-neutral-400">
                  Estado actual: <span className="font-semibold text-neutral-200">{citaEnProgreso.estado}</span> — Mecánico asignado: {citaEnProgreso.empleado?.usuario?.nombreCompleto || "Asignado"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <BadgeDS variant={getEstadoBadgeVariant(citaEnProgreso.estado)}>
                  {citaEnProgreso.estado}
                </BadgeDS>
                <ButtonDS
                  variant="secondary"
                  onClick={() => navigate("/cliente/mis-citas")}
                >
                  Ver Progreso ➔
                </ButtonDS>
              </div>
            </div>
          </CardDS>
        )}

        {/* ── ACCIONES RÁPIDAS (GRID 4 COLUMNAS) ── */}
        <section aria-label="Acciones principales">
          <SectionHeader title="Acciones Rápidas" subtitle="Gestión rápida de servicios y asistencia" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <ActionCard
              title="Agendar Cita"
              description="Reserva día, hora y mecánico preferido para el mantenimiento de tu auto."
              icon={<CalendarPlus className="h-6 w-6" />}
              buttonText="Agendar servicio ➔"
              variant="primary"
              onClick={() => setShowModal(true)}
            />
            <ActionCard
              title="Historial y Citas"
              description="Sigue en tiempo real la reparación de tu auto y repuestos cambiados."
              icon={<ClipboardList className="h-6 w-6" />}
              buttonText="Ver mis citas ➔"
              variant="secondary"
              onClick={() => navigate("/cliente/mis-citas")}
            />
            <ActionCard
              title="Gestionar Garaje"
              description="Registra la marca, modelo y placa de tus autos para agendar en 1 clic."
              icon={<Car className="h-6 w-6" />}
              buttonText="+ Registrar Auto"
              variant="purple"
              onClick={() => setModalVehiculoOpen(true)}
            />
            <ActionCard
              title="Auxilio 24/7 & Grúa"
              description="¿Avería en carretera o batería? Solicita auxilio mecánico de emergencia inmediato."
              icon={<Phone className="h-6 w-6" />}
              buttonText="🚨 Solicitar Auxilio ➔"
              variant="danger"
              onClick={() => setModalAuxilioOpen(true)}
            />
          </div>
        </section>

        {/* ── SECCIÓN MI GARAJE VEHICULAR ── */}
        <section aria-label="Mi garaje vehicular">
          <SectionHeader
            title="Mi Garaje Vehicular"
            subtitle="Vehículos guardados para agendamiento rápido"
            action={
              <ButtonDS
                variant="outline-red"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setModalVehiculoOpen(true)}
              >
                Agregar Auto
              </ButtonDS>
            }
          />

          <div className="mt-4">
            {vehiculos.length === 0 ? (
              <EmptyState
                icon={<Car className="h-8 w-8" />}
                title="No tienes vehículos registrados en tu garaje"
                description="Registra tu automóvil para completar reservaciones de mantenimiento con un solo clic."
                actionText="+ Agregar primer vehículo"
                onAction={() => setModalVehiculoOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehiculos.map((v) => (
                  <CardDS key={v.id} className="flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                          <Car className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-neutral-100">{v.marca} {v.modelo}</h4>
                          <p className="text-xs text-neutral-400">Año: {v.anio || "N/A"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarVehiculo(v.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <span className="font-mono bg-neutral-950 px-2.5 py-1 rounded-md border border-white/10 text-neutral-200 font-bold uppercase tracking-wider">
                        {v.placa}
                      </span>
                      <ButtonDS
                        variant="ghost"
                        onClick={() => setShowModal(true)}
                      >
                        Agendar con este auto ➔
                      </ButtonDS>
                    </div>
                  </CardDS>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* MODAL AGENDAR CITA */}
      <AgendarCitaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCitaAgendada={cargarDatosCliente}
      />

      {/* MODAL AGREGAR VEHÍCULO */}
      <Dialog open={modalVehiculoOpen} onOpenChange={setModalVehiculoOpen}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-neutral-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Car className="h-5 w-5 text-red-500" />
              Registrar Nuevo Vehículo en Garaje
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {vehiculoError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                {vehiculoError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1.5 uppercase text-neutral-400">Presets Rápidos</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS_AUTOS.map((p) => (
                  <button
                    key={p.placa}
                    type="button"
                    onClick={() => handleGuardarVehiculo(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10 hover:border-red-500/50 text-xs font-medium text-neutral-300 transition-colors"
                  >
                    + {p.marca} {p.modelo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Marca *</label>
              <input
                type="text"
                placeholder="Ej: Toyota"
                value={newVehiculo.marca}
                onChange={(e) => setNewVehiculo({ ...newVehiculo, marca: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Modelo</label>
                <input
                  type="text"
                  placeholder="Ej: Corolla"
                  value={newVehiculo.modelo}
                  onChange={(e) => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Año</label>
                <input
                  type="number"
                  placeholder="Ej: 2022"
                  value={newVehiculo.anio}
                  onChange={(e) => setNewVehiculo({ ...newVehiculo, anio: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Placa *</label>
              <input
                type="text"
                placeholder="Ej: 4521-XYZ"
                value={newVehiculo.placa}
                onChange={(e) => setNewVehiculo({ ...newVehiculo, placa: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <ButtonDS variant="secondary" onClick={() => setModalVehiculoOpen(false)}>
              Cancelar
            </ButtonDS>
            <ButtonDS variant="primary" isLoading={savingVehiculo} onClick={() => handleGuardarVehiculo()}>
              Guardar Vehículo
            </ButtonDS>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL AUXILIO MECÁNICO 24/7 */}
      <Dialog open={modalAuxilioOpen} onOpenChange={setModalAuxilioOpen}>
        <DialogContent className="sm:max-w-lg bg-neutral-900 border-red-500/30 text-neutral-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500 font-bold text-lg">
              <Phone className="h-5 w-5 animate-pulse" />
              Solicitud de Auxilio Mecánico 24/7 & Grúa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-xs text-red-300">
              🚨 <strong>Atención Inmediata:</strong> Al confirmar, generaremos un ticket de prioridad alta en el taller y abriremos el enlace directo de WhatsApp con nuestro equipo de grúa.
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Tipo de Emergencia *</label>
              <select
                value={auxilioForm.tipoEmergencia}
                onChange={(e) => setAuxilioForm({ ...auxilioForm, tipoEmergencia: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Fallo de Motor / Grúa requerida">🚗 Fallo de Motor / Grúa requerida</option>
                <option value="Batería descargada / Arranque">⚡ Batería descargada / Arranque de puente</option>
                <option value="Pinchazo de neumático / Auxilio">🛞 Pinchazo de neumático / Cambio de rueda</option>
                <option value="Falta de combustible / Fluidos">⛽ Falta de combustible / Recarga de fluidos</option>
                <option value="Frenos bloqueados / Accidente">⚠️ Frenos bloqueados / Incidente vial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Ubicación Actual o Referencia *</label>
              <input
                type="text"
                placeholder="Ej: Av. Banzer Km 5 frente al supermercado"
                value={auxilioForm.ubicacion}
                onChange={(e) => setAuxilioForm({ ...auxilioForm, ubicacion: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Vehículo / Placa</label>
                {vehiculos.length > 0 ? (
                  <select
                    value={auxilioForm.vehiculoPlaca}
                    onChange={(e) => setAuxilioForm({ ...auxilioForm, vehiculoPlaca: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecciona auto...</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={`${v.marca} ${v.modelo || ""} (${v.placa})`}>
                        {v.marca} ({v.placa})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ej: Toyota 4521-XYZ"
                    value={auxilioForm.vehiculoPlaca}
                    onChange={(e) => setAuxilioForm({ ...auxilioForm, vehiculoPlaca: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1 uppercase text-neutral-400">Teléfono Contacto *</label>
                <input
                  type="tel"
                  placeholder="70000000"
                  value={auxilioForm.telefonoContacto}
                  onChange={(e) => setAuxilioForm({ ...auxilioForm, telefonoContacto: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <ButtonDS variant="secondary" onClick={() => setModalAuxilioOpen(false)}>
              Cancelar
            </ButtonDS>
            <ButtonDS
              variant="danger"
              isLoading={sendingAuxilio}
              onClick={async () => {
                setSendingAuxilio(true);
                const textMsg = encodeURIComponent(
                  `🚨 *SOLICITUD DE AUXILIO MECÁNICO 24/7 - ADN MOTORS*\n\n` +
                  `👤 *Cliente:* ${getNombreCliente()}\n` +
                  `📞 *Contacto:* ${auxilioForm.telefonoContacto || "70000000"}\n` +
                  `🚗 *Placa/Auto:* ${auxilioForm.vehiculoPlaca || "No especificada"}\n` +
                  `🛠️ *Emergencia:* ${auxilioForm.tipoEmergencia}\n` +
                  `📍 *Ubicación:* ${auxilioForm.ubicacion}`
                );
                const directWaUrl = `https://wa.me/59170000000?text=${textMsg}`;

                try {
                  const token = getToken();
                  if (token) {
                    await axios.post(`${API_BASE}/api/cliente/auxilio-mecanico`, auxilioForm, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    cargarDatosCliente();
                  }
                } catch (err: any) {
                  console.warn("Backend auxilio warning:", err);
                } finally {
                  setModalAuxilioOpen(false);
                  setSendingAuxilio(false);
                  window.open(directWaUrl, "_blank");
                }
              }}
            >
              📲 Confirmar y Enviar por WhatsApp ➔
            </ButtonDS>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClienteHome;