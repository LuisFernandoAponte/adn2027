import React from "react";
import { Usuario } from "@/types/usuario";
import { Pencil, UserX, UserCheck, Shield, Wrench, User } from "lucide-react";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { ButtonDS } from "@/components/ui/ButtonDS";

interface Props {
  usuarios: Usuario[];
  onEditar: (user: Usuario) => void;
  onToggleEstado: (id: string, estadoActual: number) => void;
}

const getInitials = (name?: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getRoleBadgeVariant = (rol?: string): "purple" | "blue" | "neutral" | "emerald" => {
  switch (rol) {
    case "Administrador":
    case "admin":
      return "purple";
    case "Empleado":
    case "empleado":
      return "blue";
    case "Cliente":
    case "cliente":
      return "neutral";
    default:
      return "neutral";
  }
};

export const TablaUsuarios: React.FC<Props> = ({ usuarios, onEditar, onToggleEstado }) => {
  if (usuarios.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-950/40 rounded-2xl border border-white/5 space-y-2">
        <User className="h-8 w-8 text-neutral-600 mx-auto" />
        <p className="text-sm font-semibold text-neutral-400">No se encontraron usuarios</p>
        <p className="text-xs text-neutral-500">Intenta cambiar los filtros de búsqueda o registra un nuevo usuario.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-neutral-950/60">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-neutral-950/80 text-neutral-400 uppercase tracking-wider font-bold">
            <th className="py-3.5 px-4">Usuario / Nombre</th>
            <th className="py-3.5 px-4">Email</th>
            <th className="py-3.5 px-4">Teléfono</th>
            <th className="py-3.5 px-4">Rol & Cargo</th>
            <th className="py-3.5 px-4">Estado</th>
            <th className="py-3.5 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {usuarios.map((user) => {
            const isActivo = user.estado === 1 || (user.estado as any) === true;

            return (
              <tr
                key={user.id}
                className="hover:bg-white/[0.02] transition-colors duration-150 group"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center font-bold text-white shadow-inner flex-shrink-0 text-xs">
                      {getInitials(user.nombre_completo)}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-100">{user.nombre_completo || "Usuario Sin Nombre"}</p>
                      <span className="text-[11px] text-neutral-500 font-mono">ID: #{String(user.id).substring(0, 8)}</span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-neutral-300 font-medium">{user.email}</td>

                <td className="py-3.5 px-4 text-neutral-400 font-mono">{user.telefono || "—"}</td>

                <td className="py-3.5 px-4 space-y-1">
                  <BadgeDS variant={getRoleBadgeVariant(user.rol)}>
                    {user.rol || "Cliente"}
                  </BadgeDS>
                  {user.cargo && (
                    <p className="text-[11px] text-neutral-400 font-medium">🛠️ {user.cargo}</p>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <BadgeDS variant={isActivo ? "emerald" : "red"}>
                    {isActivo ? "Activo" : "Inactivo"}
                  </BadgeDS>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditar(user)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                      title="Editar Usuario"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleEstado(user.id, user.estado)}
                      className={`p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                        isActivo
                          ? "text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                          : "text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                      title={isActivo ? "Desactivar Acceso" : "Activar Acceso"}
                    >
                      {isActivo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TablaUsuarios;
