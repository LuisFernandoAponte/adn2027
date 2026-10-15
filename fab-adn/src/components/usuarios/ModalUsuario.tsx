import React, { useState, useEffect } from "react";
import { Usuario } from "@/types/usuario";
import { obtenerRoles, Rol } from "@/api/rolPermisoApi";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, UserPen, Shield, Mail, Phone, Lock, User, Briefcase, MapPin } from "lucide-react";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";

interface FormData {
  nombre_completo: string;
  email: string;
  password: string;
  telefono: string;
  direccion: string;
  sexo: string;
  rol_id: string;
  cargo: string;
  estado: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (data: FormData) => void;
  usuarioEditar?: Usuario | null;
}

const INITIAL_FORM: FormData = {
  nombre_completo: "",
  email: "",
  password: "",
  telefono: "",
  direccion: "",
  sexo: "Masculino",
  rol_id: "",
  cargo: "Mecánico de Taller",
  estado: 1,
};

const ModalUsuario: React.FC<Props> = ({ isOpen, onClose, onGuardar, usuarioEditar }) => {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const esEdicion = !!usuarioEditar;

  useEffect(() => {
    if (isOpen) {
      obtenerRoles()
        .then((data) => {
          setRoles(data);
          if (!form.rol_id && data.length > 0) {
            setForm((prev) => ({ ...prev, rol_id: data[0].id }));
          }
        })
        .catch((err) => console.error("Error al cargar roles:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (usuarioEditar) {
      setForm({
        nombre_completo: usuarioEditar.nombre_completo || "",
        email: usuarioEditar.email || "",
        password: "",
        telefono: usuarioEditar.telefono || "",
        direccion: usuarioEditar.direccion || "",
        sexo: usuarioEditar.sexo || "Masculino",
        rol_id: usuarioEditar.rol_id || "",
        cargo: usuarioEditar.cargo || "Mecánico de Taller",
        estado: usuarioEditar.estado === 1 ? 1 : 0,
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [usuarioEditar, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_completo.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      onGuardar(form);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleName = roles.find((r) => r.id === form.rol_id)?.descripcion || "";
  const esStaff = selectedRoleName === "Empleado" || selectedRoleName === "Administrador";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-neutral-900 border-white/10 text-neutral-100 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-neutral-100">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              {esEdicion ? <UserPen className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <span>{esEdicion ? "Editar Usuario" : "Registrar Nuevo Usuario"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 mt-1">
            Completa los datos de perfil y asignación de rol del usuario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3 text-xs">
          {/* Nombre Completo */}
          <div className="space-y-1">
            <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Ej: Carlos Ramírez"
                value={form.nombre_completo}
                onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Email y Contraseña */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="carlos@adnmotors.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
                {esEdicion ? "Nueva Contraseña (Opcional)" : "Contraseña *"}
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required={!esEdicion}
                  placeholder={esEdicion ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Rol y Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
                Rol en el Sistema *
              </label>
              <select
                value={form.rol_id}
                onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.descripcion}
                  </option>
                ))}
              </select>
            </div>

            {esStaff && (
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
                  Cargo / Especialidad
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ej: Mecánico Senior / Electricista"
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Teléfono y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <Phone className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="70000000"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-neutral-300 uppercase tracking-wider block">
                Dirección / Ciudad
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Av. Principal #123"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-white/10 pt-3 gap-2">
            <ButtonDS variant="secondary" onClick={onClose} type="button">
              Cancelar
            </ButtonDS>
            <ButtonDS variant="primary" isLoading={submitting} type="submit">
              {esEdicion ? "Guardar Cambios" : "Crear Usuario"}
            </ButtonDS>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalUsuario;
