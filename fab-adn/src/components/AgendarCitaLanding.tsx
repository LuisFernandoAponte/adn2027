import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, X, CalendarDays, Clock, User, Wrench, Car,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Phone, StickyNote, Check, Star, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAMPM } from "@/lib/time";
import { API_BASE } from "@/api/config";

interface Empleado {
  empleado_id: string;
  nombre_completo: string;
  cargo: string;
  telefono?: string;
  email?: string;
}

interface HorarioSlot {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'disponible' | 'ocupado';
  tipo_servicio: string;
}

const fade = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 }
};

const AgendarCitaLanding = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState<HorarioSlot[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre_completo: "",
    telefono: "",
    email: "",
    marca: "",
    modelo: "",
    anio: "",
    placa: "",
    tipo_servicio: "",
    descripcion_problema: "",
    fecha: "",
    hora: "",
    empleado_id: ""
  });

  const [calMes, setCalMes] = useState(new Date().getMonth());
  const [calAnio, setCalAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setSuccess(null);
      setShowCalendar(false);
      cargarEmpleados();

      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setFormData(prev => ({
            ...prev,
            nombre_completo: user.nombre_completo || user.nombreCompleto || prev.nombre_completo,
            email: user.email || prev.email,
            telefono: user.telefono || prev.telefono
          }));
        } catch (e) {}
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.empleado_id && formData.fecha && formData.tipo_servicio) {
      cargarHorarios();
    }
  }, [formData.empleado_id, formData.fecha, formData.tipo_servicio]);

  const cargarEmpleados = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cliente/empleados-disponibles`);
      const data = await res.json();
      if (data.success && data.empleados.length > 0) {
        setEmpleados(data.empleados);
        setFormData(prev => ({ ...prev, empleado_id: data.empleados[0].empleado_id }));
      }
    } catch (err) {
      console.error("Error cargando empleados:", err);
    }
  };

  const cargarHorarios = async () => {
    if (!formData.empleado_id || !formData.fecha) return;
    setLoadingHorarios(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/cliente/horarios-disponibles?empleado_id=${formData.empleado_id}&fecha=${formData.fecha}&tipo_servicio=${formData.tipo_servicio}`
      );
      const data = await res.json();
      if (data.success && data.horarios) {
        setHorariosDisponibles(data.horarios);
      } else {
        setHorariosDisponibles([]);
      }
    } catch (err) {
      console.error("Error cargando horarios:", err);
      setHorariosDisponibles([]);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const validarEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validarTelefono = (telefono: string) => telefono.length >= 7;

  const puedeAvanzar = () => {
    switch (step) {
      case 1: return formData.nombre_completo.length >= 3 && validarTelefono(formData.telefono) && validarEmail(formData.email);
      case 2: return formData.marca.length >= 2;
      case 3: return formData.tipo_servicio !== "";
      case 4: return formData.fecha !== "" && formData.hora !== "";
      default: return true;
    }
  };

  const handleSiguiente = () => {
    if (puedeAvanzar()) setStep(prev => Math.min(prev + 1, 5));
  };

  const handleAtras = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        nombre_completo: formData.nombre_completo,
        telefono: formData.telefono,
        email: formData.email,
        marca_vehiculo: formData.marca,
        modelo_vehiculo: formData.modelo,
        anio_vehiculo: formData.anio,
        placa: formData.placa,
        tipo_servicio: formData.tipo_servicio,
        descripcion_problema: formData.descripcion_problema,
        fecha_cita: formData.fecha,
        hora_cita: formData.hora,
        empleado_id: formData.empleado_id
      };

      const res = await fetch(`${API_BASE}/api/reservas/pre-reserva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("Pre-reserva creada. Revisa tu email para confirmar la cita.");
        setTimeout(() => { onClose(); navigate("/login"); }, 3000);
      } else {
        setError(data.error || "Error al crear la pre-reserva");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limiteAdelante = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 1);
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const puedeRetroceder = calAnio > hoy.getFullYear() || (calAnio === hoy.getFullYear() && calMes > hoy.getMonth());
  const puedeAvanzarCal = new Date(calAnio, calMes + 1, 1) <= limiteAdelante;

  const irMesAnterior = () => {
    if (!puedeRetroceder) return;
    if (calMes === 0) { setCalMes(11); setCalAnio(calAnio - 1); }
    else setCalMes(calMes - 1);
  };

  const irMesSiguiente = () => {
    if (!puedeAvanzarCal) return;
    if (calMes === 11) { setCalMes(0); setCalAnio(calAnio + 1); }
    else setCalMes(calMes + 1);
  };

  const primerDiaMes = new Date(calAnio, calMes, 1);
  const ultimoDiaMes = new Date(calAnio, calMes + 1, 0);
  const totalDias = ultimoDiaMes.getDate();
  const primerDiaSemanaJS = primerDiaMes.getDay();
  const offset = primerDiaSemanaJS === 0 ? 6 : primerDiaSemanaJS - 1;

  const horariosDisponiblesFiltrados = horariosDisponibles.filter(h => h.estado === 'disponible');

  const selectedEmpleado = empleados.find(e => e.empleado_id === formData.empleado_id);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getCargoIcon = (cargo: string) => {
    const c = cargo.toLowerCase();
    if (c.includes('jefe')) return Star;
    if (c.includes('secretaria')) return Briefcase;
    return Wrench;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step > 1 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAtras}
                    className="p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </motion.button>
                )}
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Agendar Cita</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Paso {step} de 5</span>
                <span>{Math.round((step / 5) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-red)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 5) * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-12rem)] px-6 py-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-300">{success}</p>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step1" {...fade}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Datos del Cliente</h3>
                        <p className="text-sm text-muted-foreground">Información de contacto para agendar</p>
                      </div>
                    </div>
                  </div>


                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nombre completo *</label>
                      <input
                        type="text"
                        value={formData.nombre_completo}
                        onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                        className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Teléfono *</label>
                        <input
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                          className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                          placeholder="70000000"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                          placeholder="correo@gmail.com"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" {...fade}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Datos del Vehículo</h3>
                      <p className="text-sm text-muted-foreground">Información de tu auto</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Marca *</label>
                      <input
                        type="text"
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                        placeholder="Ej: Toyota, Nissan, Ford..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                        <input
                          type="text"
                          value={formData.modelo}
                          onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                          className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                          placeholder="Hilux"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Año</label>
                        <input
                          type="text"
                          value={formData.anio}
                          onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                          className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                          placeholder="2020"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Placa</label>
                        <input
                          type="text"
                          value={formData.placa}
                          onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                          className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all duration-200"
                          placeholder="ABC-123"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" {...fade}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Tipo de Servicio</h3>
                      <p className="text-sm text-muted-foreground">Selecciona el servicio que necesitas</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
                      { value: 'diagnostico', label: 'Diagnóstico', icon: '🔍' },
                      { value: 'reparacion', label: 'Reparación', icon: '🔨' },
                      { value: 'electricidad', label: 'Electricidad', icon: '⚡' },
                      { value: 'alineacion', label: 'Alineación', icon: '⚙️' },
                      { value: 'frenos', label: 'Frenos', icon: '🛑' },
                      { value: 'cambio_aceite', label: 'Cambio de Aceite', icon: '💧' },
                      { value: 'otro', label: 'Otro', icon: '📋' }
                    ].map((opt) => (
                      <motion.button
                        key={opt.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({ ...formData, tipo_servicio: opt.value })}
                        className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                          formData.tipo_servicio === opt.value
                            ? 'border-primary bg-primary/20 text-primary shadow-glow'
                            : 'border-border hover:border-primary/50 bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <span className="text-lg mr-2">{opt.icon}</span>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Describe el problema (opcional)</label>
                    <textarea
                      value={formData.descripcion_problema}
                      onChange={(e) => setFormData({ ...formData, descripcion_problema: e.target.value })}
                      className="w-full mt-1.5 p-3 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/50 outline-none resize-none transition-all duration-200"
                      rows={3}
                      placeholder="Ej: Ruido al frenado, pérdida de aceite..."
                    />
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" {...fade}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Seleccionar Fecha y Hora</h3>
                      <p className="text-sm text-muted-foreground">Elige tu mecánico, fecha y horario</p>
                    </div>
                  </div>

                  {empleados.length > 0 && (
                    <div className="mb-5">
                      <label className="text-sm font-medium text-muted-foreground mb-2.5 block">Mecánico</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {empleados.map((emp) => {
                          const CargoIcon = getCargoIcon(emp.cargo);
                          const isSelected = formData.empleado_id === emp.empleado_id;
                          return (
                            <motion.button
                              key={emp.empleado_id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setFormData({ ...formData, empleado_id: emp.empleado_id, hora: "" });
                                setHorariosDisponibles([]);
                              }}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/15 shadow-red'
                                  : 'border-border hover:border-primary/40 bg-secondary/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                                }`}>
                                  {getInitials(emp.nombre_completo)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{emp.nombre_completo}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <CargoIcon className="h-3 w-3 text-primary" />
                                    <span className="text-xs text-muted-foreground truncate">{emp.cargo}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={irMesAnterior}
                        disabled={!puedeRetroceder}
                        className={`p-1.5 rounded-lg transition-all ${
                          puedeRetroceder ? 'hover:bg-primary/10 text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'
                        }`}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-bold">{nombresMeses[calMes]} {calAnio}</span>
                      <button
                        type="button"
                        onClick={irMesSiguiente}
                        disabled={!puedeAvanzarCal}
                        className={`p-1.5 rounded-lg transition-all ${
                          puedeAvanzarCal ? 'hover:bg-primary/10 text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'
                        }`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                        <div key={d} className="text-[11px] font-bold text-muted-foreground/60 text-center py-1.5">{d}</div>
                      ))}
                      {Array.from({ length: offset }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: totalDias }).map((_, index) => {
                        const diaNumero = index + 1;
                        const fechaActual = new Date(calAnio, calMes, diaNumero);
                        const fechaStr = fechaActual.toISOString().split('T')[0];
                        const diaSemanaJS = fechaActual.getDay();
                        const esFinDeSemana = diaSemanaJS === 0 || diaSemanaJS === 6;
                        const esDiaPasado = fechaActual < hoy;
                        const esHoy = fechaStr === hoy.toISOString().split('T')[0];
                        const isSelected = formData.fecha === fechaStr;
                        const esSeleccionable = !esFinDeSemana && !esDiaPasado;

                        return (
                          <button
                            key={fechaStr}
                            type="button"
                            disabled={!esSeleccionable}
                            onClick={() => esSeleccionable && setFormData({ ...formData, fecha: fechaStr, hora: "" })}
                            className={`relative p-1.5 text-sm rounded-lg font-medium transition-all ${
                              isSelected
                                ? 'bg-primary text-primary-foreground shadow-red'
                                : esSeleccionable
                                  ? esHoy
                                    ? 'border border-primary/40 text-foreground hover:bg-primary/10'
                                    : 'text-foreground hover:bg-primary/10 border border-transparent'
                                  : 'text-muted-foreground/30 cursor-not-allowed'
                            }`}
                          >
                            {diaNumero}
                            {esHoy && !isSelected && (
                              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {formData.fecha && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-sm font-medium text-muted-foreground">
                          Horarios disponibles para{' '}
                          <span className="text-foreground">
                            {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </label>
                        {loadingHorarios && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      </div>

                      {loadingHorarios ? (
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-12 rounded-xl shimmer" />
                          ))}
                        </div>
                      ) : horariosDisponiblesFiltrados.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {horariosDisponiblesFiltrados.map((slot) => {
                            const horaLabel = formatAMPM(slot.hora_inicio);
                            const isSelected = formData.hora === slot.hora_inicio;
                            return (
                              <motion.button
                                key={slot.id}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                type="button"
                                onClick={() => setFormData({ ...formData, hora: slot.hora_inicio })}
                                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground shadow-red'
                                    : 'bg-secondary border border-border hover:bg-primary/10 hover:border-primary/40'
                                }`}
                              >
                                <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                                {horaLabel}
                              </motion.button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl bg-secondary/30 border border-dashed border-border text-center">
                          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No hay horarios disponibles para esta fecha
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" {...fade}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Resumen de tu Reserva</h3>
                      <p className="text-sm text-muted-foreground">Verifica que todo esté correcto</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Datos del Cliente</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Nombre:</span> {formData.nombre_completo}</p>
                        <p><span className="text-muted-foreground">Teléfono:</span> {formData.telefono}</p>
                        <p><span className="text-muted-foreground">Email:</span> {formData.email}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Vehículo</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Marca:</span> {formData.marca}</p>
                        {formData.modelo && <p><span className="text-muted-foreground">Modelo:</span> {formData.modelo}</p>}
                        {formData.anio && <p><span className="text-muted-foreground">Año:</span> {formData.anio}</p>}
                        {formData.placa && <p><span className="text-muted-foreground">Placa:</span> {formData.placa}</p>}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Servicio</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Tipo:</span> <span className="capitalize">{formData.tipo_servicio.replace(/_/g, ' ')}</span></p>
                        {formData.descripcion_problema && <p><span className="text-muted-foreground">Problema:</span> {formData.descripcion_problema}</p>}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Fecha y Hora</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Mecánico:</span>{' '}
                          {selectedEmpleado?.nombre_completo || 'No asignado'}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Fecha:</span>{' '}
                          {formData.fecha && new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Hora:</span>{' '}
                          {formatAMPM(formData.hora)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Se enviará un enlace de verificación a tu email para confirmar la cita.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1 border-border/50">
              Cancelar
            </Button>
            {step < 5 ? (
              <Button
                onClick={handleSiguiente}
                disabled={!puedeAvanzar()}
                className="flex-1"
                style={{ background: puedeAvanzar() ? "var(--gradient-red)" : undefined }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
                style={{ background: "var(--gradient-red)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar Reserva
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AgendarCitaLanding;
