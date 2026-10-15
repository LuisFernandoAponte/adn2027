import axios from "axios";
import { API_BASE } from "./config";

export interface DashboardStats {
  totalIngresos: number;
  totalCitas: number;
  completados: number;
  enProceso: number;
  pendientes: number;
  totalClientes: number;
  topMecanico: { nombre: string; trabajos: number } | null;
}

export interface RecentService {
  id: string;
  fecha_cita: string;
  estado: string;
  cliente: string;
  mecanico: string;
  servicios: string | null;
  costo_total: number;
}

export interface DashboardCompletoExecutive {
  success: boolean;
  periodo_seleccionado: string;
  fecha_actual: string;
  nivel1: {
    ingresos_periodo_bob: number;
    variacion_porcentaje_real: number;
    ordenes_totales: number;
    ordenes_distribucion: {
      Agendadas: number;
      En_taller: number;
      En_progreso: number;
      Completadas: number;
    };
    vehiculos_en_taller: number;
    pendiente_cobro_bob: number;
  };
  nivel2: {
    estados_taller: Record<string, number>;
  };
  nivel3: {
    alertas: {
      entregas_atrasadas: number;
      sin_mecanico: number;
      revision_prolongada: number;
      pendientes_cobro: number;
      total_alertas: number;
    };
    proximas_entregas: {
      id: string;
      codigo_ot: string;
      cliente: string;
      vehiculo: string;
      placa: string;
      fecha_entrega: string;
      estado: string;
      urgencia: "a_tiempo" | "proxima" | "atrasado";
    }[];
  };
  nivel4: {
    top_servicios: { descripcion: string; veces: number }[];
    inventario: {
      total_productos: number;
      valor_total_bob: number;
      stock_bajo: number;
      sin_stock: number;
    };
  };
  nivel5: {
    actividad_reciente: {
      id: string;
      codigo_ot: string;
      accion: string;
      usuario: string;
      fecha_hora: string;
      observaciones: string | null;
    }[];
  };
  nivel6: {
    clientes_registrados: number;
    vehiculos_registrados: number;
  };
}

export const obtenerDashboardStats = async (token: string): Promise<DashboardStats> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerRecentServices = async (token: string): Promise<RecentService[]> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/recent-services`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerDashboardCompleto = async (token: string, periodo: string = "mes"): Promise<DashboardCompletoExecutive> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/completo?periodo=${periodo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export interface TendenciaIngresos {
  success: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  total_ingresos: number;
  promedio_diario: number;
  mejor_dia: { fecha: string; total: number } | null;
  tendencia: { fecha: string; total: number }[];
}

export interface TimelineEvent {
  tipo: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  enlace: string | null;
}

export interface TimelineActividad {
  success: boolean;
  timeline: TimelineEvent[];
}

export interface AlertaTaller {
  tipo: string;
  severidad: string;
  titulo: string;
  mensaje: string;
  icono: string;
  link: string | null;
}

export interface AlertasTaller {
  success: boolean;
  total_alertas: number;
  criticas: number;
  advertencias: number;
  alertas: AlertaTaller[];
}

export interface ProductividadTaller {
  success: boolean;
  total_citas_completadas: number;
  total_servicios_realizados: number;
  servicios_por_cita: number;
  costo_promedio_por_cita: number;
  servicios_mas_comunes: { servicio: string; veces: number; total: number }[];
}

export interface OcupacionTaller {
  success: boolean;
  total_empleados: number;
  ocupados_ahora: number;
  disponibles: number;
  completaron_hoy: number;
  sin_horario: number;
  tasa_ocupacion: number;
  detalle: {
    nombre: string;
    cargo: string;
    tiene_horario: boolean;
    citas_hoy: number;
    estado_actual: string;
  }[];
}

export const obtenerTendenciaIngresos = async (token: string, dias = 30): Promise<TendenciaIngresos> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/tendencia-ingresos?dias=${dias}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerTimelineActividad = async (token: string, limite = 15): Promise<TimelineActividad> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/timeline?limite=${limite}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerAlertasTaller = async (token: string): Promise<AlertasTaller> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/alertas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerProductividadTaller = async (token: string): Promise<ProductividadTaller> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/productividad`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerOcupacionTaller = async (token: string): Promise<OcupacionTaller> => {
  const response = await axios.get(`${API_BASE}/api/dashboard/ocupacion`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
