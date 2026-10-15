import { API_BASE } from "./config";

const API_URL = `${API_BASE}/api/usuarios`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const obtenerUsuarios = async () => {
  const res = await fetch(API_URL, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener usuarios");
  return res.json();
};

export const crearUsuario = async (data: {
  nombre_completo: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
  sexo?: string;
  rol_id: string;
  cargo?: string;
  edad?: number;
}) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al crear usuario");
  return json;
};

export const actualizarUsuario = async (
  id: string,
  data: {
    nombre_completo?: string;
    email?: string;
    password?: string;
    telefono?: string;
    direccion?: string;
    sexo?: string;
    rol_id?: string;
    cargo?: string;
    estado?: number;
  }
) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al actualizar usuario");
  return json;
};

export const desactivarUsuario = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al desactivar usuario");
  return json;
};

export const activarUsuario = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}/activar`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al activar usuario");
  return json;
};
