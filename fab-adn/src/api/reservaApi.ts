import { API_BASE } from './config';

export const crearPreReserva = async (data: any) => {
  const response = await fetch(`${API_BASE}/api/reservas/pre-reserva`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const verificarTokenPreReserva = async (token: string) => {
  const response = await fetch(`${API_BASE}/api/reservas/verificar/${token}`);
  return response.json();
};

export const verificarDisponibilidad = async (fecha_cita: string, hora_cita: string, empleado_id: string | null = null) => {
  let url = `${API_BASE}/api/reservas/disponibilidad?fecha_cita=${fecha_cita}&hora_cita=${hora_cita}`;
  if (empleado_id) url += `&empleado_id=${empleado_id}`;
  const response = await fetch(url);
  return response.json();
};

export const obtenerEmpleados = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/cliente/empleados-disponibles`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};

export const obtenerServicios = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/servicio/servicios`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};