import { describe, it, expect } from "vitest";
import {
  validarTransicionEstado,
  formatHoraTimeStr,
  formatRangoHoras,
  getCodigoOT,
  currencyFormatter,
} from "../features/empleado/stateMachine";

describe("Máquina de Estados y Formateadores del Panel de Empleado", () => {
  it("permite transiciones de flujo feliz válidas (Agendado -> En taller -> En progreso)", () => {
    expect(validarTransicionEstado("Agendado", "En taller").esValido).toBe(true);
    expect(validarTransicionEstado("En taller", "En progreso").esValido).toBe(true);
    expect(validarTransicionEstado("En progreso", "En revisión").esValido).toBe(true);
    expect(validarTransicionEstado("En revisión", "Completado").esValido).toBe(true);
    expect(validarTransicionEstado("Completado", "Entregado").esValido).toBe(true);
  });

  it("rechaza transiciones inválidas (ej: pasar de Agendado a Completado directamente)", () => {
    const res = validarTransicionEstado("Agendado", "Completado");
    expect(res.esValido).toBe(false);
    expect(res.error).toContain("Transición no permitida");
  });

  it("exige nota obligatoria para la regresión de En revisión a En progreso", () => {
    const resSinNota = validarTransicionEstado("En revisión", "En progreso", "");
    expect(resSinNota.esValido).toBe(false);
    expect(resSinNota.error).toContain("requiere ingresar una nota explicativa");

    const resConNota = validarTransicionEstado(
      "En revisión",
      "En progreso",
      "Pieza requiere ajuste adicional en el alineado"
    );
    expect(resConNota.esValido).toBe(true);
  });

  it("formatea la hora evitando el Epoch Bug de 1970-01-01", () => {
    expect(formatHoraTimeStr("13:30:00")).toBe("13:30");
    expect(formatHoraTimeStr("09:05:12")).toBe("09:05");
    expect(formatHoraTimeStr("2026-08-15T14:45:00Z")).toBe("14:45");
    expect(formatRangoHoras("13:30:00", "15:00:00")).toBe("13:30 – 15:00");
  });

  it("genera un código OT legible y único a partir del UUID", () => {
    expect(getCodigoOT("b4e55d75-cff0-413e-ba27-9b12d1e3631a")).toBe("OT-B4E5");
    expect(getCodigoOT("12345678-0000-0000-0000-000000000000")).toBe("OT-1234");
  });

  it("formatea montos en moneda BOB (Bolivianos)", () => {
    const formatted = currencyFormatter.format(150.5);
    expect(formatted).toContain("150,50");
  });
});
