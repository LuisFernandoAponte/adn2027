import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, X, CalendarDays, Clock, UserCheck, Wrench,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight, Plus
} from "lucide-react";
import { formatAMPM } from "@/lib/time";

interface Empleado {
  empleado_id: number;
  nombre_completo: string;
  cargo: string;
  telefono: string;
  email: string;
}

interface Servicio {
  id: number;
  categoria: string;
  descripcion: string;
  costo: string | number;
  duracion_estimada: string;
  estado: string | number;
}

interface Horario {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  estado: 'disponible' | 'ocupado';
  tipo_servicio: string;
}

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AgendarCitaModal = ({ isOpen, onClose }: ModalProps) => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [selectedEmpleado, setSelectedEmpleado] = useState<number | null>(null);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<Servicio[]>([]);
  const [servicioParaAgregar, setServicioParaAgregar] = useState<number | ''>('');

  const [tipoServicio, setTipoServicio] = useState<'revision' | 'reparacion' | ''>('');
  const [fecha, setFecha] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [calMes, setCalMes] = useState(new Date().getMonth());
  const [calAnio, setCalAnio] = useState(new Date().getFullYear());

  const navigate = useNavigate();

  // Reset & load data when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEmpleado(null);
      setServiciosSeleccionados([]);
      setServicioParaAgregar('');
      setTipoServicio('');
      setFecha('');
      setHoraSeleccionada(null);
      setHorarios([]);
      setError(null);
      setSuccess(null);
      setCalMes(new Date().getMonth());
      setCalAnio(new Date().getFullYear());
      return;
    }

    const cargarDatos = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const empRes = await axios.get("/api/cliente/empleados-disponibles", { headers });
        setEmpleados(empRes.data.empleados || []);

        const servRes = await axios.get("/api/servicio/servicios", { headers });
        setServicios(servRes.data.servicios || []);
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        if (!localStorage.getItem("token")) {
          setError("Para confirmar la cita debes haber iniciado sesión con tu cuenta de cliente");
        } else {
          setError(err.response?.data?.error || "No se pudieron cargar empleados o servicios");
        }
      }
    };
    cargarDatos();
  }, [isOpen]);

  // Load schedules when employee / date / service type changes
  useEffect(() => {
    const cargarHorarios = async () => {
      if (!selectedEmpleado || !fecha || !tipoServicio) {
        setHorarios([]);
        return;
      }
      setLoadingHorarios(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `/api/cliente/horarios-disponibles?empleado_id=${selectedEmpleado}&fecha=${fecha}&tipo_servicio=${tipoServicio}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHorarios(res.data.horarios || []);
        setHoraSeleccionada(null);
      } catch (err: any) {
        console.error("Error al cargar horarios:", err);
        setError(err.response?.data?.error || "No se pudieron cargar los horarios");
        setHorarios([]);
      } finally {
        setLoadingHorarios(false);
      }
    };
    cargarHorarios();
  }, [selectedEmpleado, fecha, tipoServicio]);

  // ── Multi-service helpers ──────────────────────────────────────────────────
  const getCostoNum = (s: Servicio) => {
    const n = typeof s.costo === 'number' ? s.costo : parseFloat(s.costo as string);
    return isNaN(n) ? 0 : n;
  };

  const serviciosDisponibles = servicios.filter(
    s => !serviciosSeleccionados.some(sel => sel.id === s.id)
  );

  const agregarServicio = () => {
    if (!servicioParaAgregar) return;
    const servicio = servicios.find(s => s.id === Number(servicioParaAgregar));
    if (!servicio || serviciosSeleccionados.some(s => s.id === servicio.id)) return;
    setServiciosSeleccionados(prev => [...prev, servicio]);
    setServicioParaAgregar('');
    setError(null);
  };

  const eliminarServicio = (id: number) => {
    setServiciosSeleccionados(prev => prev.filter(s => s.id !== id));
  };

  const costoTotal = serviciosSeleccionados.reduce((acc, s) => acc + getCostoNum(s), 0);
  // ──────────────────────────────────────────────────────────────────────────

  // ✅ handleSubmit CORREGIDO - con validaciones estrictas y formato correcto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // ✅ VALIDACIONES ESTRICTAS antes de enviar
    if (!selectedEmpleado || selectedEmpleado <= 0) {
      setError("Selecciona un empleado válido");
      setLoading(false);
      return;
    }

    if (serviciosSeleccionados.length === 0) {
      setError("Debes seleccionar al menos un servicio");
      setLoading(false);
      return;
    }

    if (!fecha || fecha.trim() === "") {
      setError("Selecciona una fecha válida");
      setLoading(false);
      return;
    }

    if (!horaSeleccionada || horaSeleccionada.trim() === "") {
      setError("Selecciona un horario válido");
      setLoading(false);
      return;
    }

    // ✅ Formatear hora al formato esperado por el backend: "HH:mm:ss"
    const horaFormateada = horaSeleccionada.includes(':') && horaSeleccionada.length <= 5
      ? `${horaSeleccionada}:00`
      : horaSeleccionada;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sesión expirada. Inicia sesión nuevamente.");

      // ✅ PAYLOAD CORRECTO y validado
      const payload = {
        id_empleado: selectedEmpleado,
        id_servicios: serviciosSeleccionados.map(s => s.id),
        fecha_cita: fecha, // Formato: "YYYY-MM-DD"
        hora_inicio: horaFormateada, // Formato: "HH:mm:ss"
      };

      console.log("📤 Payload enviado al backend:", payload); // Debug

      const res = await axios.post(
        "/api/cliente/agendar-cita",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess("✅ Cita agendada exitosamente. Revisa tu correo para la confirmación.");
        setTimeout(() => {
          onClose();
          navigate("/cliente/mis-citas");
        }, 3500);
      }
    } catch (err: any) {
      console.error("❌ Error al agendar cita:", err);
      const msg = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        "Error al agendar la cita. Verifica todos los campos.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (time: string) => formatAMPM(time);
  const formatRange = (inicio: string, fin: string) =>
    `${formatHour(inicio)} - ${formatHour(fin)}`;

  if (!isOpen) return null;

  // === CALENDARIO ===
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const primerDiaMes = new Date(calAnio, calMes, 1);
  const ultimoDiaMes = new Date(calAnio, calMes + 1, 0);
  const totalDias = ultimoDiaMes.getDate();
  const primerDiaSemanaJS = primerDiaMes.getDay();
  const offset = primerDiaSemanaJS === 0 ? 6 : primerDiaSemanaJS - 1;
  const nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const puedeRetroceder = calAnio > hoy.getFullYear() || (calAnio === hoy.getFullYear() && calMes > hoy.getMonth());
  const limiteAdelante = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 1);
  const puedeAvanzar = new Date(calAnio, calMes + 1, 1) <= limiteAdelante;

  const irMesAnterior = () => {
    if (!puedeRetroceder) return;
    if (calMes === 0) { setCalMes(11); setCalAnio(calAnio - 1); }
    else setCalMes(calMes - 1);
  };
  const irMesSiguiente = () => {
    if (!puedeAvanzar) return;
    if (calMes === 11) { setCalMes(0); setCalAnio(calAnio + 1); }
    else setCalMes(calMes + 1);
  };

  const stepsCompleted = [
    tipoServicio,
    selectedEmpleado,
    serviciosSeleccionados.length > 0 ? 'yes' : null,
    fecha,
    horaSeleccionada
  ].filter(Boolean).length;
  const totalSteps = 5;

  const canSubmit = !loading && 
                    selectedEmpleado && selectedEmpleado > 0 && 
                    serviciosSeleccionados.length > 0 && 
                    fecha.trim() !== "" && 
                    horaSeleccionada && horaSeleccionada.trim() !== "";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          style={{ boxShadow: "0 0 40px hsl(0 100% 50% / 0.1)" }}
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 group"
                  title="Volver atrás"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Agendar Cita</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-primary/10 transition-all duration-300 group"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progreso</span>
                <span>{stepsCompleted}/{totalSteps} campos</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-red)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(stepsCompleted / totalSteps) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Scrollable Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-10rem)] px-6 py-5 space-y-5">

            {/* Messages */}
            <AnimatePresence>
              {success && (
                <motion.div
                  className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30"
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-300 font-medium">{success}</p>
                </motion.div>
              )}
              {error && (
                <motion.div
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tipo de Servicio */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wrench className="h-4 w-4 text-primary" />
                Tipo de Servicio
              </label>
              <select
                value={tipoServicio}
                onChange={(e) => {
                  setTipoServicio(e.target.value as 'revision' | 'reparacion');
                  setFecha("");
                  setHoraSeleccionada(null);
                }}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 outline-none appearance-none cursor-pointer"
                required
              >
                <option value="">-- Selecciona tipo de servicio --</option>
                <option value="revision">Revision (09:00 AM - 12:00 PM)</option>
                <option value="reparacion">Reparacion (02:00 PM - 06:00 PM)</option>
              </select>
              {tipoServicio && (
                <p className="text-xs text-muted-foreground pl-1">
                  {tipoServicio === 'revision' && 'Las revisiones solo se agendan en horario de manana'}
                  {tipoServicio === 'reparacion' && 'Las reparaciones solo se agendan en horario de tarde'}
                </p>
              )}
            </div>

            {/* Empleado */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserCheck className="h-4 w-4 text-primary" />
                Empleado
              </label>
              <select
                value={selectedEmpleado || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedEmpleado(val > 0 ? val : null); // ✅ Evitar 0 como valor válido
                  setFecha("");
                  setHoraSeleccionada(null);
                }}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 outline-none appearance-none cursor-pointer"
                required
              >
                <option value="">-- Selecciona un empleado --</option>
                {empleados.map((emp) => (
                  <option key={emp.empleado_id} value={emp.empleado_id}>
                    {emp.nombre_completo} • {emp.cargo}
                  </option>
                ))}
              </select>
            </div>

            {/* Servicios (multi-select) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wrench className="h-4 w-4 text-primary" />
                Servicios
                {serviciosSeleccionados.length > 0 && (
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {serviciosSeleccionados.length} seleccionado{serviciosSeleccionados.length > 1 ? 's' : ''}
                  </span>
                )}
              </label>

              {/* Picker row */}
              <div className="flex gap-2">
                <select
                  value={servicioParaAgregar}
                  onChange={(e) => setServicioParaAgregar(Number(e.target.value) || '')}
                  className="flex-1 p-3 rounded-xl bg-secondary border border-border text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 outline-none appearance-none cursor-pointer"
                >
                  <option value="">-- Selecciona un servicio --</option>
                  {serviciosDisponibles.map((s) => {
                    const costo = getCostoNum(s).toFixed(2);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.descripcion} • ${costo}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={agregarServicio}
                  disabled={!servicioParaAgregar}
                  className={`px-4 rounded-xl border transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                    servicioParaAgregar
                      ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                      : 'border-border text-muted-foreground/40 cursor-not-allowed'
                  }`}
                  title="Agregar servicio"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Selected services list */}
              <AnimatePresence>
                {serviciosSeleccionados.length > 0 && (
                  <motion.div
                    className="rounded-xl border border-border bg-secondary/30 overflow-hidden"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-3 space-y-1">
                      <AnimatePresence>
                        {serviciosSeleccionados.map((s, idx) => (
                          <motion.div
                            key={s.id}
                            className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <span className="text-xs font-bold text-primary w-5 flex-shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="flex-1 text-sm text-foreground min-w-0 truncate">
                              {s.descripcion}
                            </span>
                            <span className="text-sm font-semibold text-foreground flex-shrink-0">
                              ${getCostoNum(s).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => eliminarServicio(s.id)}
                              className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all duration-200 flex-shrink-0"
                              title="Quitar servicio"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    {/* Total row */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border-t border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Total estimado
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        ${costoTotal.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {serviciosSeleccionados.length === 0 && (
                <p className="text-xs text-muted-foreground pl-1">
                  Puedes agregar uno o más servicios para esta cita
                </p>
              )}
            </div>

            {/* Calendario */}
            {(selectedEmpleado && tipoServicio) && (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Selecciona un día
                </label>

                <div className="rounded-xl border border-border bg-secondary/50 p-3">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button
                      type="button"
                      onClick={irMesAnterior}
                      disabled={!puedeRetroceder}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        puedeRetroceder ? 'hover:bg-primary/10 text-foreground cursor-pointer' : 'text-muted-foreground/30 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-bold text-foreground capitalize">
                      {nombresMeses[calMes]} {calAnio}
                    </span>
                    <button
                      type="button"
                      onClick={irMesSiguiente}
                      disabled={!puedeAvanzar}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        puedeAvanzar ? 'hover:bg-primary/10 text-foreground cursor-pointer' : 'text-muted-foreground/30 cursor-not-allowed'
                      }`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d, i) => (
                      <div key={`header-${i}`} className="text-[11px] font-bold text-muted-foreground text-center py-1.5 uppercase tracking-wider">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: offset }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2" />
                    ))}
                    {Array.from({ length: totalDias }).map((_, index) => {
                      const diaNumero = index + 1;
                      const fechaActual = new Date(calAnio, calMes, diaNumero);
                      const fechaStr = fechaActual.toISOString().split('T')[0];
                      const diaSemanaJS = fechaActual.getDay();
                      const esFinDeSemana = diaSemanaJS === 0 || diaSemanaJS === 6;
                      const esDiaPasado = fechaActual < hoy;
                      const esHoy = fechaStr === hoy.toISOString().split('T')[0];
                      const isSelected = fecha === fechaStr;
                      const esSeleccionable = !esFinDeSemana && !esDiaPasado;

                      return (
                        <button
                          key={fechaStr}
                          type="button"
                          disabled={!esSeleccionable}
                          onClick={() => esSeleccionable && (setFecha(fechaStr), setHoraSeleccionada(null))}
                          className={`
                            p-1.5 text-sm rounded-lg font-medium transition-all duration-200
                            flex flex-col items-center justify-center min-h-[2.5rem] relative
                            ${isSelected
                              ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50 z-10'
                              : esSeleccionable
                                ? 'bg-card hover:bg-primary/10 hover:border-primary/30 text-foreground border border-border/50 cursor-pointer'
                                : 'bg-secondary/30 text-muted-foreground/40 cursor-not-allowed'
                            }
                            ${esHoy && !isSelected ? 'ring-2 ring-primary/40 ring-offset-1 ring-offset-card font-bold' : ''}
                          `}
                          title={
                            esFinDeSemana ? 'No se agendan citas los fines de semana'
                              : esDiaPasado ? 'Fecha no disponible'
                              : `${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][diaSemanaJS]} ${diaNumero} - Disponible`
                          }
                        >
                          <span className="font-semibold">{diaNumero}</span>
                          {esHoy && !isSelected && (
                            <span className="text-[8px] text-primary mt-0.5 font-bold">HOY</span>
                          )}
                          {esFinDeSemana && !esDiaPasado && (
                            <span className="text-[9px] text-muted-foreground/40 mt-0.5">✕</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {fecha && (
                  <motion.div
                    className="p-3 rounded-xl bg-primary/10 border border-primary/30"
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm text-primary font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Horarios disponibles */}
            {(fecha && (horarios.length > 0 || loadingHorarios)) && (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Horarios disponibles
                </label>

                {loadingHorarios ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-sm">Cargando horarios...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-border bg-secondary/50 p-3">
                    {horarios.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => h.estado === 'disponible' && setHoraSeleccionada(h.hora_inicio)}
                        disabled={h.estado === 'ocupado'}
                        className={`
                          p-3 text-sm rounded-xl font-medium transition-all duration-200 text-left flex flex-col gap-1
                          ${h.estado === 'disponible'
                            ? horaSeleccionada === h.hora_inicio
                              ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 cursor-pointer border border-green-500/20'
                            : 'bg-secondary/30 text-muted-foreground/40 cursor-not-allowed border border-border/30'
                          }
                        `}
                        title={h.estado === 'ocupado' ? 'No disponible' : `Disponible: ${formatRange(h.hora_inicio, h.hora_fin)}`}
                      >
                        <span className="font-semibold">{formatRange(h.hora_inicio, h.hora_fin)}</span>
                        {h.estado === 'ocupado' && <span className="text-xs">Ocupado</span>}
                        {horaSeleccionada === h.hora_inicio && h.estado === 'disponible' && (
                          <span className="text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Seleccionado
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {horaSeleccionada && (
                  <motion.div
                    className="p-3 rounded-xl bg-primary/10 border border-primary/30"
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm text-primary font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Hora:                       <span className="font-bold">{formatAMPM(horaSeleccionada)}</span>
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 font-medium text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  !canSubmit
                    ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                    : 'text-primary-foreground cursor-pointer'
                }`}
                style={canSubmit ? { background: "var(--gradient-red)", boxShadow: "var(--shadow-red)" } : {}}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar Cita
                    {serviciosSeleccionados.length > 1 && ` (${serviciosSeleccionados.length} servicios)`}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AgendarCitaModal;