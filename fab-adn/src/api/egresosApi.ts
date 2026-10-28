import axios from "axios";
import { API_BASE } from "./config";
import { getToken } from "@/lib/auth";

export interface EgresoItem {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
  metodo_pago?: string;
  referencia_comprobante?: string;
  empleado?: {
    id: string;
    nombre: string;
    cargo: string;
  } | null;
  registrado_por: string;
  observaciones?: string;
}

export interface ResumenFinanciero {
  periodo: {
    mes: number;
    anio: number;
    nombre_mes: string;
  };
  metricas: {
    ingresos_totales: number;
    egresos_totales: number;
    utilidad_neta: number;
    margen_ganancia_porcentaje: number;
    comparativa_mes_anterior: {
      ingresos_ant: number;
      egresos_ant: number;
      utilidad_ant: number;
      crecimiento_ingresos_pct: number;
      variacion_egresos_pct: number;
    };
  };
  distribucion_categorias: Array<{
    categoria: string;
    nombre_legible: string;
    total: number;
    porcentaje: number;
    cantidad_comprobantes: number;
  }>;
}

const getHeaders = () => {
  const token = getToken();
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
};

export const obtenerEgresos = async (params?: {
  categoria?: string;
  desde?: string;
  hasta?: string;
}): Promise<EgresoItem[]> => {
  const res = await axios.get(`${API_BASE}/api/egresos`, {
    ...getHeaders(),
    params,
  });
  return res.data?.egresos || [];
};

export const obtenerBalanceResumen = async (params?: {
  mes?: number;
  anio?: number;
}): Promise<ResumenFinanciero> => {
  const res = await axios.get(`${API_BASE}/api/egresos/balance/resumen`, {
    ...getHeaders(),
    params,
  });
  return res.data;
};

export const crearEgreso = async (data: {
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
  metodoPago?: string;
  referenciaComprobante?: string;
  empleadoId?: string;
  observaciones?: string;
}) => {
  const res = await axios.post(`${API_BASE}/api/egresos`, data, getHeaders());
  return res.data;
};

export const eliminarEgreso = async (id: string) => {
  const res = await axios.delete(`${API_BASE}/api/egresos/${id}`, getHeaders());
  return res.data;
};
