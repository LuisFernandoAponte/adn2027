import { API_BASE } from "./config";
//const API_URL = "http://localhost:3000/api/facturas";

export const generarFactura = async (citaId: string, token: string) => {
  const response = await fetch(`${API_BASE}/api/facturas/generar/${citaId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
};

export const obtenerFactura = async (id: string, token: string) => {
  const response = await fetch(`${API_BASE}/api/facturas/${id}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Error al obtener factura");
  }

  return response.json();
};


export const descargarFacturaPDF = async (id: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/facturas/${id}/pdf`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      window.open(`${API_BASE}/api/facturas/${id}/pdf?token=${encodeURIComponent(token)}`, "_blank");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Factura_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    window.open(`${API_BASE}/api/facturas/${id}/pdf?token=${encodeURIComponent(token)}`, "_blank");
  }
};