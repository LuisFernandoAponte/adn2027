import { API_BASE } from "./config";
//para conectarnos al backend
const API_URL = `${API_BASE}/api/auth`;

export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  return response.json();
};
export const refreshToken = async () => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();

  localStorage.setItem("token", data.token);

  return data;
};