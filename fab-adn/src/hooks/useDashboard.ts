import { useQuery } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import {
  obtenerDashboardStats,
  obtenerRecentServices,
  obtenerDashboardCompleto,
  obtenerTendenciaIngresos,
  obtenerTimelineActividad,
  obtenerAlertasTaller,
  obtenerProductividadTaller,
  obtenerOcupacionTaller,
  DashboardStats,
  RecentService,
  DashboardCompleto,
  TendenciaIngresos,
  TimelineActividad,
  AlertasTaller,
  ProductividadTaller,
  OcupacionTaller,
} from "@/api/dashboardApi";

const POLL_INTERVAL = 30000;

export const useDashboardStats = () => {
  const token = getToken();

  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => obtenerDashboardStats(token!),
    enabled: !!token,
    refetchInterval: POLL_INTERVAL,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useRecentServices = () => {
  const token = getToken();

  return useQuery<RecentService[]>({
    queryKey: ["dashboard", "recent-services"],
    queryFn: () => obtenerRecentServices(token!),
    enabled: !!token,
    refetchInterval: POLL_INTERVAL,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useDashboardCompleto = (periodo: string = "mes") => {
  const token = getToken();

  return useQuery({
    queryKey: ["dashboard", "completo", periodo],
    queryFn: () => obtenerDashboardCompleto(token!, periodo),
    enabled: !!token,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
};

export const useTendenciaIngresos = (dias = 30) => {
  const token = getToken();

  return useQuery<TendenciaIngresos>({
    queryKey: ["dashboard", "tendencia-ingresos", dias],
    queryFn: () => obtenerTendenciaIngresos(token!, dias),
    enabled: !!token,
    refetchInterval: 120000,
    staleTime: 60000,
    retry: 2,
  });
};

export const useTimelineActividad = (limite = 15) => {
  const token = getToken();

  return useQuery<TimelineActividad>({
    queryKey: ["dashboard", "timeline", limite],
    queryFn: () => obtenerTimelineActividad(token!, limite),
    enabled: !!token,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
};

export const useAlertasTaller = () => {
  const token = getToken();

  return useQuery<AlertasTaller>({
    queryKey: ["dashboard", "alertas"],
    queryFn: () => obtenerAlertasTaller(token!),
    enabled: !!token,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
};

export const useProductividadTaller = () => {
  const token = getToken();

  return useQuery<ProductividadTaller>({
    queryKey: ["dashboard", "productividad"],
    queryFn: () => obtenerProductividadTaller(token!),
    enabled: !!token,
    refetchInterval: 120000,
    staleTime: 60000,
    retry: 2,
  });
};

export const useOcupacionTaller = () => {
  const token = getToken();

  return useQuery<OcupacionTaller>({
    queryKey: ["dashboard", "ocupacion"],
    queryFn: () => obtenerOcupacionTaller(token!),
    enabled: !!token,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
};
