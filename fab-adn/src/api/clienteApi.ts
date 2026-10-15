import { API_BASE } from "./config";

export const buscarClientes = async (nombre: string, token: string) => {
  const response = await fetch(
    `${API_BASE}/api/cliente/buscar?nombre=${nombre}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
};

export const obtenerCitasCliente = async (clienteId: number, token: string) => {
  const response = await fetch(
    `${API_BASE}/api/cliente/${clienteId}/citas`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
};