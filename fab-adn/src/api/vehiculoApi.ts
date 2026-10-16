import axios from "axios";
import { API_BASE } from "./config";
import { getToken } from "@/lib/auth";

export interface VehiculoItem {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  cliente: string;
  cliente_id: string;
  cliente_telefono: string;
  cliente_email?: string;
  fecha_registro?: string;
}

export interface VisitaHistorial {
  id: string;
  fecha: string;
  fecha_entrega?: string | null;
  estado: string;
  kilometraje: number;
  diagnostico: string;
  observaciones?: string;
  mecanico: string;
  servicios: Array<{
    id: string;
    nombre: string;
    costo: number;
    categoria?: string;
  }>;
  repuestos: Array<{
    id: string;
    nombre: string;
    codigo: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  costo_total: number;
  fotos?: string[];
  garantia: {
    activa: boolean;
    dias_transcurridos: number;
    dias_restantes: number;
    cobertura: string;
  };
}

export interface HistorialClinicoResponse {
  success: boolean;
  vehiculo: {
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    ultimo_kilometraje: number;
    cliente: string;
    telefono: string;
    email?: string;
  };
  resumen_clinico: {
    total_visitas: number;
    total_invertido_bob: number;
    garantias_activas_count: number;
    ultima_visita: string;
    diagnostico_reciente: string;
  };
  mantenimiento_predictivo: {
    proximo_cambio_aceite_km: number;
    proxima_revision_frenos_km: number;
    intervalo_sugerido: string;
  };
  garantias_vigentes: Array<{
    orden_id: string;
    fecha: string;
    servicios: string[];
    dias_restantes: number;
    cobertura: string;
  }>;
  curva_kilometraje: Array<{
    fecha: string;
    kilometraje: number;
    diagnostico_breve: string;
  }>;
  historial_visitas: VisitaHistorial[];
}

export interface MantenimientoPreventivoItem {
  id: string;
  placa: string;
  vehiculo: string;
  marca: string;
  modelo: string;
  anio: number;
  cliente: string;
  telefono: string;
  email?: string;
  km_actual: number;
  km_siguiente: number;
  dias_desde_ultimo_servicio: number;
  fecha_ultimo_servicio: string;
  ultimo_servicio_nombre: string;
  servicio_recomendado: string;
  urgencia: "VENCIDO" | "PROXIMO" | "AL_DIA";
  urgencia_label: string;
}

export interface MantenimientoPreventivoResponse {
  success: boolean;
  metricas: {
    total_vehiculos_monitoreados: number;
    vencidos_urgentes: number;
    proximos_este_mes: number;
    al_dia: number;
  };
  vehiculos: MantenimientoPreventivoItem[];
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

export const obtenerVehiculos = async (): Promise<VehiculoItem[]> => {
  const res = await axios.get(`${API_BASE}/vehiculos`, getHeaders());
  return res.data?.vehiculos || [];
};

export const obtenerHistorialClinico = async (placa: string): Promise<HistorialClinicoResponse> => {
  const res = await axios.get(`${API_BASE}/vehiculos/historial/${encodeURIComponent(placa)}`, getHeaders());
  return res.data;
};

export const obtenerMantenimientosPreventivos = async (): Promise<MantenimientoPreventivoResponse> => {
  const res = await axios.get(`${API_BASE}/vehiculos/mantenimiento-preventivo`, getHeaders());
  return res.data;
};
