// src/features/empleado/stateMachine.ts
// Máquina de estados estricta y formateadores Intl fuera del ciclo de renderizado

export type EstadoTrabajoType =
  | "Agendado"
  | "En taller"
  | "En progreso"
  | "En revisión"
  | "Completado"
  | "Entregado"
  | "Cancelado";

// Matriz de transiciones permitidas (Estado Origen -> Estados Destino Posibles)
export const TRANSICIONES_VALIDAS: Record<EstadoTrabajoType, EstadoTrabajoType[]> = {
  Agendado: ["En taller", "Cancelado"],
  "En taller": ["En progreso", "Cancelado"],
  "En progreso": ["En revisión", "Cancelado"],
  "En revisión": ["Completado", "En progreso", "Cancelado"], // Regresión a "En progreso" requiere nota
  Completado: ["Entregado"],
  Entregado: [],
  Cancelado: [],
};

// Etiqueta contextual del botón de acción principal según el estado actual
export const ETIQUETAS_ACCION_ESTADO: Record<EstadoTrabajoType, string | null> = {
  Agendado: "Ingresar a Taller ➔",
  "En taller": "Iniciar Reparación ➔",
  "En progreso": "Pasar a Revisión ➔",
  "En revisión": "Aprobar y Completar ➔",
  Completado: "Entregar a Cliente ➔",
  Entregado: null,
  Cancelado: null,
};

// Siguiente estado por defecto según flujo feliz
export const SIGUIENTE_ESTADO_MAP: Record<EstadoTrabajoType, EstadoTrabajoType | null> = {
  Agendado: "En taller",
  "En taller": "En progreso",
  "En progreso": "En revisión",
  "En revisión": "Completado",
  Completado: "Entregado",
  Entregado: null,
  Cancelado: null,
};

/**
 * Valida si una transición de estado es válida según las reglas de negocio
 */
export function validarTransicionEstado(
  desde: EstadoTrabajoType,
  hasta: EstadoTrabajoType,
  nota?: string
): { esValido: boolean; error?: string } {
  const opciones = TRANSICIONES_VALIDAS[desde] || [];
  if (!opciones.includes(hasta)) {
    return {
      esValido: false,
      error: `Transición no permitida: no se puede pasar de "${desde}" a "${hasta}".`,
    };
  }

  // Regla especial: regresión de "En revisión" a "En progreso" requiere nota obligatoria
  if (desde === "En revisión" && hasta === "En progreso" && (!nota || nota.trim().length < 5)) {
    return {
      esValido: false,
      error: 'Para reabrir el trabajo de "En revisión" a "En progreso" se requiere ingresar una nota explicativa de al menos 5 caracteres.',
    };
  }

  return { esValido: true };
}

// ── FORMATEADORES INTL INSTANCIADOS UNA SOLA VEZ FUERA DEL COMPONENTE ──
export const currencyFormatter = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  minimumFractionDigits: 2,
});

export const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "full",
});

export const shortDateFormatter = new Intl.DateTimeFormat("es-BO", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/**
 * SOLUCIÓN EPOCH BUG:
 * Formatea cadenas de hora (ej: "13:30:00" o "13:30") a "13:30" SIN instanciar new Date("1970-01-01T...")
 */
export function formatHoraTimeStr(horaStr?: string | null): string {
  if (!horaStr) return "Sin especificar";

  // Si viene una fecha ISO completa (ej: 2026-08-15T13:30:00Z)
  if (horaStr.includes("T")) {
    const timePart = horaStr.split("T")[1];
    if (timePart) {
      const parts = timePart.split(":");
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
  }

  // Si viene un string simple de hora tipo "13:30:00" o "13:30"
  const parts = horaStr.split(":");
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return horaStr;
}

/**
 * Formatea rango de horas (inicio - fin) sin sufrir de Epoch Bug
 */
export function formatRangoHoras(inicio?: string | null, fin?: string | null): string {
  const hInicio = formatHoraTimeStr(inicio);
  const hFin = fin ? formatHoraTimeStr(fin) : null;
  return hFin ? `${hInicio} – ${hFin}` : `${hInicio} hs`;
}

/**
 * Formatea un id UUID a un Código de Orden de Trabajo (OT) legible (ej: OT-8F12)
 */
export function getCodigoOT(citaId?: string | number | null): string {
  if (!citaId) return "OT-0000";
  const idStr = String(citaId).replace(/-/g, "").toUpperCase();
  return `OT-${idStr.substring(0, 4)}`;
}
