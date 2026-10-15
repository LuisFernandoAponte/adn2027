import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "@/api/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, MapPin, Shield, Calendar, CheckCircle2, AlertCircle,
  Loader2, Send, Pencil, Lock, UserCircle, Camera, X, RefreshCw
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { CardDS, ProgressBar } from "@/components/ui/DesignSystem";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { EmptyState } from "@/components/ui/EmptyState";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";

export interface UserProfile {
  id: number | string;
  nombre_completo: string;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  sexo?: string | null;
  edad?: number | null;
  fecha_reg?: string;
  rol_id?: number;
  rol?: string;
  email_verificado: boolean;
}

// ── ProfileSkeleton ──
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-12 animate-pulse`}>
      <div className="h-16 border-b border-white/10 bg-neutral-950/50" />
      <div className={DESIGN_TOKENS.layout.container}>
        <div className="rounded-3xl bg-neutral-900 border border-white/5 overflow-hidden">
          <div className="h-44 bg-neutral-800" />
          <div className="px-6 pb-6 pt-0 relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-neutral-800 border-4 border-neutral-950 -mt-12 mb-4" />
            <div className="h-8 w-64 bg-neutral-800 rounded-lg mb-2" />
            <div className="h-4 w-48 bg-neutral-800/60 rounded-lg" />
          </div>
        </div>
        <div className="h-20 rounded-2xl bg-neutral-900 border border-white/5 p-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-neutral-900 border border-white/5 p-5 space-y-3" />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── ProfileHeader ──
interface ProfileHeaderProps {
  profile: UserProfile;
  onAvatarClick?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onAvatarClick }) => {
  const initial = profile.nombre_completo?.charAt(0).toUpperCase() || "U";
  const rolName = profile.rol || (profile.rol_id === 1 ? "Administrador" : profile.rol_id === 2 ? "Empleado" : "Cliente VIP");

  return (
    <div className="relative rounded-3xl overflow-hidden bg-neutral-900/90 border border-white/10 shadow-2xl">
      <div className={`relative h-44 ${DESIGN_TOKENS.gradients.headerBanner} overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      </div>

      <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div
            onClick={onAvatarClick}
            className="group relative -mt-12 sm:-mt-14 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-neutral-950 ring-4 ring-neutral-950 shadow-2xl flex items-center justify-center text-4xl sm:text-5xl font-black text-red-500 cursor-pointer overflow-hidden transition-all duration-200 hover:ring-red-900/50"
            title="Haz clic para cambiar foto de perfil"
            aria-label="Foto de perfil del usuario"
          >
            <span className="select-none">{initial}</span>
            <div className="absolute inset-0 bg-neutral-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 text-white">
              <Camera className="h-6 w-6 text-red-400 animate-bounce" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-200">Cambiar</span>
            </div>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight">
              {profile.nombre_completo}
            </h1>
            <p className="text-sm text-neutral-400 font-mono flex items-center justify-center sm:justify-start gap-1.5 break-all">
              <Mail className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0" />
              {profile.email}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap pt-2 sm:pt-0">
          <BadgeDS variant="role" icon={<Shield className="h-3.5 w-3.5" />}>
            {rolName}
          </BadgeDS>

          {profile.email_verificado ? (
            <BadgeDS variant="verified" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
              Verificado
            </BadgeDS>
          ) : (
            <BadgeDS variant="amber" icon={<AlertCircle className="h-3.5 w-3.5 animate-pulse" />}>
              Verificación Pendiente
            </BadgeDS>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ProfileCompleteness ──
interface ProfileCompletenessProps {
  profile: UserProfile;
  onCompleteField: (field: string) => void;
}

export const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({ profile }) => {
  const fields = [
    { key: "telefono", filled: Boolean(profile.telefono) },
    { key: "direccion", filled: Boolean(profile.direccion) },
    { key: "sexo", filled: Boolean(profile.sexo) },
    { key: "edad", filled: Boolean(profile.edad) },
    { key: "email_verificado", filled: Boolean(profile.email_verificado) },
  ];

  const filledCount = fields.filter((f) => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  const getMicrocopy = () => {
    if (percentage === 100) return "🎉 ¡Tu perfil está al 100%! Tienes acceso completo a todas las funciones.";
    if (percentage >= 60) return "💪 ¡Excelente! Te faltan pocos datos para completar tu perfil.";
    return "🚀 Completa tu información para agendar servicios de taller más rápido.";
  };

  return (
    <CardDS className="space-y-3">
      <ProgressBar
        percentage={percentage}
        label="Completitud del Perfil"
        microcopy={getMicrocopy()}
      />
    </CardDS>
  );
};

// ── ProfileInfoCard ──
interface ProfileInfoCardProps {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  fieldName: string;
  highlight?: boolean;
  onCompleteField?: (fieldName: string) => void;
}

export const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({
  icon,
  label,
  value,
  fieldName,
  highlight,
  onCompleteField,
}) => {
  const isMissing = !value || value === "—" || value === "No especificada" || value === "No registrada";

  return (
    <CardDS className="group flex flex-col justify-between">
      <dt className={DESIGN_TOKENS.colors.label + " flex items-center gap-2 mb-2"}>
        <span className="text-red-400 group-hover:text-red-300 transition-colors duration-200">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className="text-neutral-100 font-medium text-base flex items-center justify-between gap-2">
        {isMissing ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-neutral-500 italic text-sm">Sin registrar</span>
            {onCompleteField && fieldName !== "Miembro desde" && fieldName !== "Rol" && (
              <button
                type="button"
                onClick={() => onCompleteField(fieldName)}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded px-2 py-0.5 bg-red-500/10 border border-red-500/20 cursor-pointer"
                aria-label={`Completar ${label}`}
              >
                + Completar
              </button>
            )}
          </div>
        ) : (
          <span className={highlight ? "text-red-400 font-bold" : "text-neutral-100"}>
            {value}
          </span>
        )}
      </dd>
    </CardDS>
  );
};

// ── Main Perfil Component ──
const Perfil: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    nombre_completo: "",
    telefono: "",
    direccion: "",
    sexo: "Masculino",
    edad: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get("verified");
    const message = params.get("message");

    if (verified === "success") {
      setToastMessage({ type: "success", text: "¡Email verificado correctamente!" });
    } else if (verified === "error") {
      setError(message || "No se pudo verificar tu email. Intenta nuevamente.");
    }
  }, [location.search]);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Debes iniciar sesión para ver tu perfil");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data.user || response.data;

      if (!userData || !userData.id) {
        throw new Error("No se recibió información válida del usuario");
      }

      const userDataProcessed: UserProfile = {
        ...userData,
        email_verificado: !!userData.email_verificado,
      };

      setProfile(userDataProcessed);
      setFormFields({
        nombre_completo: userData.nombre_completo || "",
        telefono: userData.telefono || "",
        direccion: userData.direccion || "",
        sexo: userData.sexo || "Masculino",
        edad: userData.edad ? String(userData.edad) : "",
      });
    } catch (err: any) {
      const mensajeError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "No se pudo cargar la información del perfil";

      setError(mensajeError);

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [location.search]);

  const handleVerifyEmail = async () => {
    if (!profile?.email) return;
    setVerifyingEmail(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/auth/verify-email`,
        { email: profile.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToastMessage({
        type: "success",
        text: `Enlace enviado a ${profile.email}. Revisa tu bandeja de entrada o spam.`,
      });
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: err.response?.data?.error || "Error al enviar enlace de verificación",
      });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleOpenCompleteModal = (_fieldName: string) => {
    setEditModalOpen(true);
  };

  const handleSaveFullProfile = async () => {
    setSavingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        nombreCompleto: formFields.nombre_completo,
        telefono: formFields.telefono,
        direccion: formFields.direccion,
        sexo: formFields.sexo,
        edad: formFields.edad ? parseInt(formFields.edad) : null,
      };

      const response = await axios.put(`${API_BASE}/api/auth/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.user) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const updatedUserData = {
          ...currentUser,
          nombreCompleto: response.data.user.nombre_completo || payload.nombreCompleto,
          nombre_completo: response.data.user.nombre_completo || payload.nombreCompleto,
          telefono: response.data.user.telefono,
          direccion: response.data.user.direccion,
          sexo: response.data.user.sexo,
          edad: response.data.user.edad,
        };
        localStorage.setItem("user", JSON.stringify(updatedUserData));
      }

      setToastMessage({ type: "success", text: "¡Perfil actualizado exitosamente en el sistema!" });
      setEditModalOpen(false);
      fetchProfile();
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: err.response?.data?.error || "Error al guardar el perfil",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (error && !profile) {
    return (
      <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} flex items-center justify-center px-4`}>
        <CardDS hoverEffect={false} className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <p className="text-neutral-200 text-base font-medium">{error}</p>
          <div className="flex flex-col gap-3">
            <ButtonDS variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={fetchProfile}>
              Reintentar
            </ButtonDS>
            <ButtonDS variant="secondary" onClick={() => navigate("/login")}>
              Ir a Iniciar Sesión
            </ButtonDS>
          </div>
        </CardDS>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-16`}>
      {/* ── SHARED NAVBAR ── */}
      <Navbar />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-5 py-4 rounded-2xl border shadow-2xl flex items-center gap-3 max-w-md ${
              toastMessage.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                : "bg-red-950/90 border-red-500/30 text-red-200"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            )}
            <p className="text-xs font-semibold">{toastMessage.text}</p>
            <button onClick={() => setToastMessage(null)} className="ml-auto text-neutral-400 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={DESIGN_TOKENS.layout.container}>
        {/* Component 1: Header */}
        <ProfileHeader profile={profile} onAvatarClick={() => handleOpenCompleteModal("avatar")} />

        {/* Component 2: Completeness Progress Bar */}
        <ProfileCompleteness profile={profile} onCompleteField={handleOpenCompleteModal} />

        {/* Email Verification Callout */}
        {!profile.email_verificado && (
          <CardDS className="border-amber-500/20 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-400" />
                Verifica tu correo electrónico
              </h4>
              <p className="text-xs text-neutral-400">
                Para mayor seguridad y habilitar reservaciones sin restricciones.
              </p>
            </div>
            <ButtonDS
              variant="secondary"
              isLoading={verifyingEmail}
              icon={<Send className="h-3.5 w-3.5 text-amber-400" />}
              onClick={handleVerifyEmail}
            >
              Enviar Enlace
            </ButtonDS>
          </CardDS>
        )}

        {/* Component 3: Accessible DL/DT/DD Grid Cards */}
        <section aria-label="Información detallada del perfil">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileInfoCard
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={profile.telefono}
              fieldName="telefono"
              onCompleteField={handleOpenCompleteModal}
            />
            <ProfileInfoCard
              icon={<Shield className="h-4 w-4" />}
              label="Rol"
              value={profile.rol || (profile.rol_id === 1 ? "Administrador" : profile.rol_id === 2 ? "Empleado" : "Cliente VIP")}
              fieldName="Rol"
              highlight
            />
            <ProfileInfoCard
              icon={<UserCircle className="h-4 w-4" />}
              label="Sexo"
              value={profile.sexo}
              fieldName="sexo"
              onCompleteField={handleOpenCompleteModal}
            />
            <ProfileInfoCard
              icon={<User className="h-4 w-4" />}
              label="Edad"
              value={profile.edad ? `${profile.edad} años` : null}
              fieldName="edad"
              onCompleteField={handleOpenCompleteModal}
            />
            <ProfileInfoCard
              icon={<MapPin className="h-4 w-4" />}
              label="Dirección"
              value={profile.direccion}
              fieldName="direccion"
              onCompleteField={handleOpenCompleteModal}
            />
            <ProfileInfoCard
              icon={<Calendar className="h-4 w-4" />}
              label="Miembro desde"
              value={
                profile.fecha_reg
                  ? new Date(profile.fecha_reg).toLocaleDateString("es-BO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"
              }
              fieldName="Miembro desde"
            />
          </dl>
        </section>

        {/* Component 4: Action Buttons (Responsive Layout) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6">
          <ButtonDS
            variant="primary"
            fullWidth
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => handleOpenCompleteModal("full")}
            className="sm:flex-1"
          >
            Editar perfil completo
          </ButtonDS>
          <ButtonDS
            variant="secondary"
            icon={<Lock className="h-4 w-4 text-neutral-400" />}
            onClick={() => alert("Función de cambio de contraseña activa en Seguridad de la Cuenta.")}
          >
            Cambiar contraseña
          </ButtonDS>
          <ButtonDS
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Volver
          </ButtonDS>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-3xl bg-neutral-900 border border-white/10 p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-red-500" />
                Actualizar Información de Perfil
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 text-neutral-400 hover:text-white rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={DESIGN_TOKENS.colors.label + " block mb-1"}>Nombre Completo</label>
                <input
                  type="text"
                  value={formFields.nombre_completo}
                  onChange={(e) => setFormFields({ ...formFields, nombre_completo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={DESIGN_TOKENS.colors.label + " block mb-1"}>Teléfono</label>
                  <input
                    type="text"
                    placeholder="70000000"
                    value={formFields.telefono}
                    onChange={(e) => setFormFields({ ...formFields, telefono: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className={DESIGN_TOKENS.colors.label + " block mb-1"}>Edad</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={formFields.edad}
                    onChange={(e) => setFormFields({ ...formFields, edad: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className={DESIGN_TOKENS.colors.label + " block mb-1"}>Sexo</label>
                <select
                  value={formFields.sexo}
                  onChange={(e) => setFormFields({ ...formFields, sexo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className={DESIGN_TOKENS.colors.label + " block mb-1"}>Dirección de Residencia</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Banzer #120, Santa Cruz"
                  value={formFields.direccion}
                  onChange={(e) => setFormFields({ ...formFields, direccion: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <ButtonDS variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </ButtonDS>
              <ButtonDS variant="primary" isLoading={savingProfile} onClick={handleSaveFullProfile}>
                Guardar Cambios
              </ButtonDS>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Perfil;