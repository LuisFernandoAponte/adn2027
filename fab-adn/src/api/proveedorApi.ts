import axios from "axios";
import { API_BASE } from "./config";
import { getToken } from "../lib/auth";

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tiempoEntregaDias: number;
  estado: boolean;
  fechaReg: string;
  _count?: { inventarios: number };
}

export const obtenerProveedores = async (): Promise<Proveedor[]> => {
  const token = getToken();
  const response = await axios.get(`${API_BASE}/api/proveedores`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.proveedores;
};
