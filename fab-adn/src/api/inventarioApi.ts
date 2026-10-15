import axios from "axios";
import { API_BASE } from "./config";
import { getToken } from "../lib/auth";

export interface MovimientoItem {
  id: string;
  inventarioId: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  citaId?: string | null;
  usuarioId: string;
  observaciones?: string | null;
  fechaReg: string;
  usuario?: { nombreCompleto: string };
}

export interface InventarioItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  costo: number;
  precio_venta: number;
  margen_unitario?: number;
  margen_porcentaje?: number;
  valor_costo?: number;
  valor_venta?: number;
  stock_bajo: boolean;
  estado_stock?: "AGOTADO" | "STOCK CRÍTICO" | "STOCK BAJO" | "STOCK NORMAL";
  unidadMedida: string;
  ubicacion: string | null;
  proveedorId?: string | null;
  proveedor: string | { id: string; nombre: string } | null;
  total_usos?: number;
  sugerencia_reabastecimiento?: number;
  estado: boolean;
  fechaReg: string;
}

export interface ResumenInventario {
  total_repuestos: number;
  total_unidades: number;
  valor_inventario_costo: number;
  valor_potencial_venta: number;
  margen_potencial_total: number;
  count_stock_bajo: number;
  count_criticos: number;
  count_agotados: number;
  count_normales: number;
}

export interface InventarioListResponse {
  success: boolean;
  inventario: InventarioItem[];
}

export const obtenerInventario = async (params?: { categoria?: string; busqueda?: string; stock_bajo?: string }): Promise<InventarioItem[]> => {
  const token = getToken();
  const response = await axios.get(`${API_BASE}/api/inventario`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return response.data.inventario;
};

export const obtenerInventarioItem = async (id: string): Promise<InventarioItem> => {
  const token = getToken();
  const response = await axios.get(`${API_BASE}/api/inventario/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.inventario;
};

export const crearInventarioItem = async (data: any) => {
  const token = getToken();
  const response = await axios.post(`${API_BASE}/api/inventario`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const actualizarInventarioItem = async (id: string, data: any) => {
  const token = getToken();
  const response = await axios.put(`${API_BASE}/api/inventario/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const ajustarStock = async (id: string, data: { cantidad: number; tipo: string; observaciones?: string }) => {
  const token = getToken();
  const response = await axios.patch(`${API_BASE}/api/inventario/${id}/stock`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const eliminarInventarioItem = async (id: string) => {
  const token = getToken();
  const response = await axios.delete(`${API_BASE}/api/inventario/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const obtenerResumenInventarioApi = async (): Promise<{ resumen: ResumenInventario; top_mas_utilizados: InventarioItem[] }> => {
  const token = getToken();
  const response = await axios.get(`${API_BASE}/api/inventario/resumen`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const obtenerMovimientosItemApi = async (id: string): Promise<MovimientoItem[]> => {
  const token = getToken();
  const response = await axios.get(`${API_BASE}/api/inventario/${id}/movimientos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.movimientos || [];
};

export const obtenerProveedoresApi = async (): Promise<{ id: string; nombre: string }[]> => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_BASE}/api/proveedores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return Array.isArray(response.data) ? response.data : (response.data.proveedores || response.data.data || []);
  } catch (err) {
    return [];
  }
};
