import axios from "axios";
import { API_BASE } from "./config";
import { getToken } from "../lib/auth";

export interface RepuestoAsignado {
  id: string;
  inventario_id: string;
  codigo?: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface HistorialEstado {
  id: string;
  estado: string;
  estadoAnterior?: string | null;
  observaciones?: string | null;
  fechaCambio: string;
}

export interface Trabajo {
  id: string;
  fecha_cita: string;
  hora_inicio: string;
  hora_fin: string | null;
  observaciones: string | null;
  cliente: string;
  cliente_email?: string | null;
  cliente_telefono: string | null;
  mecanico: string;
  mecanico_id?: string;
  vehiculo?: string;
  placa?: string;
  estado: string;
  tipo_servicio?: string;
  servicios: string | null;
  repuestos?: RepuestoAsignado[];
  costo_servicios?: number;
  costo_repuestos?: number;
  costo_total: number;
  fotos?: string[];
  historial_estados?: HistorialEstado[];
}

export const ESTADOS_CITA = [
  "Agendado",
  "En taller",
  "En revisión",
  "En progreso",
  "Completado",
  "Entregado",
  "Cancelado",
] as const;

export const obtenerCitasAdmin = async (token: string): Promise<Trabajo[]> => {
  const response = await axios.get(
    `${API_BASE}/api/admin/citas`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const cambiarEstadoCita = async (
  token: string,
  citaId: string,
  estado: string,
  observaciones?: string
): Promise<{ message: string }> => {
  const response = await axios.patch(
    `${API_BASE}/api/admin/citas/${citaId}/estado`,
    { estado, observaciones },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

export const agregarRepuestoATrabajo = async (
  arg1: string,
  arg2: string,
  arg3: string | number,
  arg4?: number
): Promise<{ success: boolean; message: string }> => {
  let token: string | null = null;
  let citaId = "";
  let inventarioId = "";
  let cantidad = 1;

  if (typeof arg3 === "number") {
    token = getToken();
    citaId = arg1;
    inventarioId = arg2;
    cantidad = arg3;
  } else {
    token = arg1;
    citaId = arg2;
    inventarioId = arg3 as string;
    cantidad = arg4 || 1;
  }

  if (!token) token = getToken();

  const response = await axios.post(
    `${API_BASE}/api/admin/citas/${citaId}/repuestos`,
    { inventarioId, cantidad },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

export const quitarRepuestoDeTrabajo = async (
  arg1: string,
  arg2: string,
  arg3?: string
): Promise<{ success: boolean; message: string }> => {
  let token: string | null = null;
  let citaId = "";
  let repuestoId = "";

  if (!arg3) {
    token = getToken();
    citaId = arg1;
    repuestoId = arg2;
  } else {
    token = arg1;
    citaId = arg2;
    repuestoId = arg3;
  }

  if (!token) token = getToken();

  const response = await axios.delete(
    `${API_BASE}/api/admin/citas/${citaId}/repuestos/${repuestoId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

// --- Empleado ---

export const obtenerCitasEmpleado = async (token: string): Promise<Trabajo[]> => {
  const response = await axios.get(
    `${API_BASE}/api/empleado/citas`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

export const cambiarEstadoCitaEmpleado = async (
  token: string,
  citaId: string,
  estado: string,
  observaciones?: string
): Promise<{ message: string }> => {
  const response = await axios.patch(
    `${API_BASE}/api/empleado/citas/${citaId}/estado`,
    { estado, observaciones },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

export const obtenerMisCitas = async (): Promise<Trabajo[]> => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/api/cliente/citas`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Error al obtener las citas");
  }

  return await response.json();
};

export const subirFotoTrabajo = async (token: string, citaId: string, fotoBase64: string): Promise<{ success: boolean; fotos: string[] }> => {
  const response = await axios.post(
    `${API_BASE}/api/admin/citas/${citaId}/fotos`,
    { fotoBase64 },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const eliminarFotoTrabajo = async (token: string, citaId: string, fotoUrl: string): Promise<{ success: boolean; fotos: string[] }> => {
  const response = await axios.delete(
    `${API_BASE}/api/admin/citas/${citaId}/fotos`,
    {
      data: { fotoUrl },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

export const guardarInformeTecnico = async (
  citaId: string,
  data: { diagnostico?: string; observaciones?: string; kilometraje?: number }
): Promise<{ success: boolean; message: string }> => {
  const token = getToken();
  const response = await axios.put(
    `${API_BASE}/api/citas/${citaId}/informe-tecnico`,
    data,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};