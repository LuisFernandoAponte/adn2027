// auth.ts usa authApi.ts

import { login as loginRequest } from "@/api/authApi";

export const login = async (email: string, password: string) => {
  const data = await loginRequest(email, password);

  // Validación de respuesta
  if (!data.token) {
    throw new Error(data.error || "Error al iniciar sesión");
  }

  // Guardar sesión
  localStorage.setItem("token", data.token);

  // ⚠️ tu backend devuelve user o usuario dependiendo de cómo lo hiciste
  const user = data.user || data.usuario;
  localStorage.setItem("user", JSON.stringify(user));

  // Guardar permisos por separado para acceso rápido
  if (user?.permisos) {
    localStorage.setItem("permisos", JSON.stringify(user.permisos));
  }

  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("permisos");
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

export const getToken = (): string | null => {
  return localStorage.getItem("token");
};

export const getUser = () => {
  const user = localStorage.getItem("user");

  if (!user || user === "undefined") return null;

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

// Obtener permisos del usuario del localStorage
export const getPermisos = (): string[] => {
  const permisos = localStorage.getItem("permisos");
  if (!permisos) return [];
  try {
    return JSON.parse(permisos);
  } catch {
    return [];
  }
};

// Verificar si el usuario tiene un permiso específico
export const tienePermiso = (permiso: string): boolean => {
  const permisos = getPermisos();
  return permisos.includes(permiso);
};