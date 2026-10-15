import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import {
  obtenerCitasAdmin,
  cambiarEstadoCita,
  Trabajo,
} from "@/api/citaApi";

const POLL_INTERVAL = 30000;

export const useTrabajos = () => {
  const token = getToken();

  return useQuery<Trabajo[]>({
    queryKey: ["trabajos"],
    queryFn: () => obtenerCitasAdmin(token!),
    enabled: !!token,
    refetchInterval: POLL_INTERVAL,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useCambiarEstadoCita = () => {
  const queryClient = useQueryClient();
  const token = getToken();

  return useMutation({
    mutationFn: ({ citaId, estado }: { citaId: string; estado: string }) =>
      cambiarEstadoCita(token!, citaId, estado),
    onMutate: async ({ citaId, estado }: { citaId: string; estado: string }) => {
      await queryClient.cancelQueries({ queryKey: ["trabajos"] });
      const previous = queryClient.getQueryData<Trabajo[]>(["trabajos"]);
      queryClient.setQueryData<Trabajo[]>(["trabajos"], (old) =>
        old?.map((t) => (t.id === citaId ? { ...t, estado } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["trabajos"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trabajos"] });
    },
  });
};
