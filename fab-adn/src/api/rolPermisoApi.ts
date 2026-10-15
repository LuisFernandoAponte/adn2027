import { API_BASE } from "./config";

const API_URL_ROLES = `${API_BASE}/api/roles`;
const API_URL_PERMISOS = `${API_BASE}/api/permisos`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// ==================== ROLES ====================

export interface Permiso {
  id: string;
  permiso: string;
  modulo?: string;
  descripcion?: string;
  esCritico?: boolean;
}

export interface UsuarioRol {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  estado?: boolean;
  fechaReg?: string;
}

export interface Rol {
  id: string;
  descripcion: string;
  estado?: boolean;
  esSistema?: boolean;
  permisosCount?: number;
  usuariosCount?: number;
  usuarios?: UsuarioRol[];
  permisos: Permiso[];
}

export const obtenerRoles = async (): Promise<Rol[]> => {
  const res = await fetch(API_URL_ROLES, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener roles");
  return res.json();
};

export const obtenerRol = async (id: string): Promise<Rol> => {
  const res = await fetch(`${API_URL_ROLES}/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener rol");
  return res.json();
};

export const crearRol = async (descripcion: string) => {
  const res = await fetch(API_URL_ROLES, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ descripcion }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al crear rol");
  return json;
};

export const actualizarRol = async (id: string, descripcion: string) => {
  const res = await fetch(`${API_URL_ROLES}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ descripcion }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al actualizar rol");
  return json;
};

export const eliminarRol = async (id: string) => {
  const res = await fetch(`${API_URL_ROLES}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al eliminar rol");
  return json;
};

export const asignarPermisosARol = async (rolId: string, permisoIds: string[]) => {
  const res = await fetch(`${API_URL_ROLES}/${rolId}/permisos`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ permisoIds }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al asignar permisos");
  return json;
};

export const obtenerUsuariosDeRol = async (rolId: string): Promise<UsuarioRol[]> => {
  const res = await fetch(`${API_URL_ROLES}/${rolId}/usuarios`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al obtener usuarios del rol");
  return json.usuarios || [];
};

// ==================== PERMISOS ====================

export const obtenerPermisos = async (): Promise<Permiso[]> => {
  const res = await fetch(API_URL_PERMISOS, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener permisos");
  return res.json();
};

export const crearPermiso = async (permiso: string) => {
  const res = await fetch(API_URL_PERMISOS, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ permiso }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al crear permiso");
  return json;
};

export const actualizarPermiso = async (id: string, permiso: string) => {
  const res = await fetch(`${API_URL_PERMISOS}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ permiso }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al actualizar permiso");
  return json;
};

export const eliminarPermiso = async (id: string) => {
  const res = await fetch(`${API_URL_PERMISOS}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al eliminar permiso");
  return json;
};

export const obtenerMisPermisos = async (): Promise<Permiso[]> => {
  const res = await fetch(`${API_URL_PERMISOS}/mis-permisos`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener permisos del usuario");
  return res.json();
};
