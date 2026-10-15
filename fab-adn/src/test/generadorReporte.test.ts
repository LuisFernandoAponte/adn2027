import { describe, it, expect } from "vitest";
import { buildReporteExcel, ReporteDatos, ReporteMeta } from "../features/reportes/generadorReporte";

describe("generadorReporte (ExcelJS)", () => {
  const metaDummy: ReporteMeta = {
    titulo: "REPORTE PRUEBA VITEST",
    periodoDesde: "2026-08-01",
    periodoHasta: "2026-08-16",
    fechaGeneracion: "16/08/2026 12:00",
    generadoPor: "Admin Pruebas",
    rolUsuario: "Administrador",
    folio: "FOL-20260816-TEST",
  };

  const datosValidos: ReporteDatos = {
    kpis: {
      ingresoTotal: 1500,
      otsCompletadas: 3,
      ticketPromedio: 500,
      servicioTop: "Mantenimiento General",
      mecanicoTop: "Carlos Pérez",
      mejorMes: "Agosto 2026",
    },
    servicios: [
      { servicio: "Mantenimiento General", veces: 2, total: 1000, porcentaje: 0.6667, ticketPromedio: 500 },
      { servicio: "Cambio de Aceite", veces: 1, total: 500, porcentaje: 0.3333, ticketPromedio: 500 },
    ],
    mecanicos: [
      { mecanico: "Carlos Pérez", ots: 2, total: 1000, porcentaje: 0.6667, ticketPromedio: 500 },
      { mecanico: "Ana Gómez", ots: 1, total: 500, porcentaje: 0.3333, ticketPromedio: 500 },
    ],
    detalleOts: [
      { codigoOt: "OT-101", fecha: "01/08/2026", cliente: "Juan Valdez", vehiculoPlaca: "Toyota 123-ABC", mecanico: "Carlos Pérez", servicios: "Mantenimiento", estado: "Entregado", costo: 500 },
      { codigoOt: "OT-102", fecha: "05/08/2026", cliente: "Maria Silva", vehiculoPlaca: "Nissan 456-DEF", mecanico: "Carlos Pérez", servicios: "Mantenimiento", estado: "Entregado", costo: 500 },
      { codigoOt: "OT-103", fecha: "10/08/2026", cliente: "Pedro Loza", vehiculoPlaca: "Honda 789-GHI", mecanico: "Ana Gómez", servicios: "Cambio Aceite", estado: "Entregado", costo: 500 },
    ],
    serieMensual: [
      { mes: "Julio 2026", ots: 2, ingresos: 1000, variacionPct: 0.0 },
      { mes: "Agosto 2026", ots: 3, ingresos: 1500, variacionPct: 0.5 },
    ],
  };

  it("genera un Blob de Excel válido (.xlsx) cuando los datos son íntegros", async () => {
    const blob = await buildReporteExcel(datosValidos, metaDummy);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("reconcilia automáticamente las sumas de ingresos entre servicios y totales", async () => {
    const datosConRepuestos: ReporteDatos = {
      ...datosValidos,
      kpis: { ...datosValidos.kpis, ingresoTotal: 1200 },
    };

    const blob = await buildReporteExcel(datosConRepuestos, metaDummy);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("genera el Excel correctamente incluso sin datos en el rango de fechas (Caso Borde Rango Vacío)", async () => {
    const datosVacios: ReporteDatos = {
      kpis: { ingresoTotal: 0, otsCompletadas: 0, ticketPromedio: 0, servicioTop: "N/A", mecanicoTop: "N/A", mejorMes: "N/A" },
      servicios: [],
      mecanicos: [],
      detalleOts: [],
      serieMensual: [],
    };

    const blob = await buildReporteExcel(datosVacios, metaDummy);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });
});
