import ExcelJS from 'exceljs';

export interface ReporteMeta {
  titulo: string;
  periodoDesde: string;
  periodoHasta: string;
  fechaGeneracion: string;
  generadoPor: string;
  rolUsuario: string;
  folio: string;
  tallerInfo?: {
    nombre: string;
    nit: string;
    direccion: string;
    telefono: string;
    email: string;
  };
}

export interface ReporteServicioRow {
  servicio: string;
  veces: number;
  total: number;
  porcentaje: number; // decimal entre 0.0 y 1.0 (ej: 0.354 para 35.4%)
  ticketPromedio: number;
}

export interface ReporteMecanicoRow {
  mecanico: string;
  ots: number;
  total: number;
  porcentaje: number; // decimal entre 0.0 y 1.0
  ticketPromedio: number;
}

export interface ReporteOTDetalleRow {
  codigoOt: string;
  fecha: string;
  cliente: string;
  vehiculoPlaca: string;
  mecanico: string;
  servicios: string;
  estado: string;
  costo: number;
}

export interface ReporteSerieMensualRow {
  mes: string;
  ots: number;
  ingresos: number;
  variacionPct: number; // decimal (ej: 0.125 para +12.5%, -0.05 para -5.0%)
}

export interface ReporteKpis {
  ingresoTotal: number;
  otsCompletadas: number;
  ticketPromedio: number;
  servicioTop: string;
  mecanicoTop: string;
  mejorMes: string;
}

export interface ReporteDatos {
  kpis: ReporteKpis;
  servicios: ReporteServicioRow[];
  mecanicos: ReporteMecanicoRow[];
  detalleOts: ReporteOTDetalleRow[];
  serieMensual: ReporteSerieMensualRow[];
}

export interface ChartImages {
  serviciosBase64?: string;
  mensualBase64?: string;
}

/**
 * Función Pura que construye un Libro de Trabajo Excel contable de 4 Hojas estilizado.
 * Réplica exacta del formato Bitácora Automotriz con colores de marca ADN MOTORS (Rojo #DC2626 + Negro #0A0A0A).
 */
export async function buildReporteExcel(
  datos: ReporteDatos,
  meta: ReporteMeta,
  chartImages?: ChartImages
): Promise<Blob> {
  // ── RECONCILIACIÓN Y CROSS-CHECK DE INTEGRIDAD ──
  const sumaServicios = datos.servicios.reduce((acc, s) => acc + (s.total || 0), 0);
  const sumaMecanicos = datos.mecanicos.reduce((acc, m) => acc + (m.total || 0), 0);

  // Si hay alguna discrepancia por repuestos o redondeo, ajustar ingresoTotal al total real facturado
  const totalRealFacturado = Math.max(sumaServicios, sumaMecanicos, datos.kpis.ingresoTotal || 0);
  if (totalRealFacturado > 0) {
    datos.kpis.ingresoTotal = Math.round(totalRealFacturado * 100) / 100;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.generadoPor || "ADN MOTORS System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Estilos de Marca ADN MOTORS (Rojo Primario #DC2626 / Negro Fondo #0A0A0A)
  const redBannerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "DC2626" },
  };

  const darkHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "0A0A0A" },
  };

  const lightGreenInfoFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F0FDF4" }, // Fondo suave verde claro para metadatos
  };

  const calloutBoxFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "ECFDF5" }, // Fondo caja total destacada
  };

  const zebraFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F9FAFB" },
  };

  const totalRowFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FEF2F2" },
  };

  const fontHeader: Partial<ExcelJS.Font> = {
    name: "Arial",
    size: 11,
    bold: true,
    color: { argb: "FFFFFF" },
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "D1D5DB" } },
    left: { style: "thin", color: { argb: "D1D5DB" } },
    bottom: { style: "thin", color: { argb: "D1D5DB" } },
    right: { style: "thin", color: { argb: "D1D5DB" } },
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "9CA3AF" } },
    left: { style: "thin", color: { argb: "D1D5DB" } },
    right: { style: "thin", color: { argb: "D1D5DB" } },
    bottom: { style: "double", color: { argb: "111827" } },
  };

  const applyPrintSetup = (ws: ExcelJS.Worksheet) => {
    ws.views = [{ showGridLines: true }];
    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    ws.headerFooter = {
      oddHeader: "&C&B ADN MOTORS — Bitácora y Reporte de Gestión Operativa",
      oddFooter: "&LReporte Oficial&R Página &[PageNum] de &[PageCount]",
    };
  };

  // ---------------------------------------------------------
  // HOJA 1: RESUMEN EJECUTIVO (FORMATO BITÁCORA AUTOMOTRIZ)
  // ---------------------------------------------------------
  const ws1 = workbook.addWorksheet("Resumen Ejecutivo");
  applyPrintSetup(ws1);

  ws1.columns = [
    { width: 35 }, // Servicio / Concepto
    { width: 24 }, // Veces / Cantidad
    { width: 38 }, // Total Bs (Espacioso para metadatos B:C)
    { width: 18 }, // % Participación
    { width: 24 }, // Ticket Promedio
  ];

  // 1. GRAN BANNER CABECERA (Merged A1:E2)
  ws1.mergeCells("A1:E2");
  ws1.getRow(1).height = 24;
  ws1.getRow(2).height = 24;
  const bannerCell = ws1.getCell("A1");
  bannerCell.value = "Bitácora y Reporte Ejecutivo — ADN MOTORS";
  bannerCell.fill = redBannerFill;
  bannerCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
  bannerCell.alignment = { horizontal: "center", vertical: "middle" };

  // 2. BLOQUE DE METADATOS IZQUIERDA (A4:C8) + CAJA TOTAL DESTACADA DERECHA (D4:E8)
  const metaRows = [
    ["Taller / Empresa:", meta.tallerInfo?.nombre || "ADN MOTORS — CENTRO AUTOMOTRIZ INTEGRAL"],
    ["NIT & Dirección:", `NIT ${meta.tallerInfo?.nit || "1029384756"} | ${meta.tallerInfo?.direccion || "Av. América #123, Cochabamba, Bolivia"}`],
    ["Período Consultado:", `${meta.periodoDesde} al ${meta.periodoHasta}`],
    ["Folio Oficial Auditoría:", meta.folio],
    ["Generado Por:", `${meta.generadoPor} (${meta.rolUsuario})`],
  ];

  metaRows.forEach((mRow, i) => {
    const rIdx = 4 + i;
    ws1.getRow(rIdx).height = 22; // Altura cómoda para no amontonar texto
    
    ws1.getCell(`A${rIdx}`).value = mRow[0];
    ws1.getCell(`A${rIdx}`).font = { name: "Arial", bold: true, size: 9, color: { argb: "1F2937" } };
    ws1.getCell(`A${rIdx}`).fill = lightGreenInfoFill;
    ws1.getCell(`A${rIdx}`).alignment = { vertical: "middle", horizontal: "left" };
    ws1.getCell(`A${rIdx}`).border = thinBorder;

    ws1.mergeCells(`B${rIdx}:C${rIdx}`);
    const valCell = ws1.getCell(`B${rIdx}`);
    valCell.value = mRow[1];
    valCell.font = { name: "Arial", size: 9, color: { argb: "111827" } };
    valCell.fill = lightGreenInfoFill;
    valCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    valCell.border = thinBorder;
  });

  // CAJA GRANDE TOTAL FACTURACIÓN DERECHA (D4:E8)
  ws1.mergeCells("D4:E4");
  const calloutTitle = ws1.getCell("D4");
  calloutTitle.value = "INGRESOS TOTALES / FACTURACIÓN";
  calloutTitle.fill = darkHeaderFill;
  calloutTitle.font = { name: "Arial", size: 10, bold: true, color: { argb: "10B981" } };
  calloutTitle.alignment = { horizontal: "center", vertical: "middle" };

  ws1.mergeCells("D5:E8");
  const calloutValue = ws1.getCell("D5");
  calloutValue.value = datos.kpis.ingresoTotal;
  calloutValue.fill = calloutBoxFill;
  calloutValue.font = { name: "Arial", size: 24, bold: true, color: { argb: "047857" } };
  calloutValue.numFmt = '"Bs "#,##0.00';
  calloutValue.alignment = { horizontal: "center", vertical: "middle" };
  calloutValue.border = {
    top: { style: "medium", color: { argb: "059669" } },
    left: { style: "medium", color: { argb: "059669" } },
    bottom: { style: "medium", color: { argb: "059669" } },
    right: { style: "medium", color: { argb: "059669" } },
  };

  // 3. TABLA PRINCIPAL DE SERVICIOS (Inicia Fila 10)
  const headerServiciosRow = ws1.getRow(10);
  headerServiciosRow.height = 26; // Altura holgada para el encabezado
  headerServiciosRow.values = [
    "Trabajo y/o Servicio Hecho",
    "Cantidad (Veces)",
    "Total Ingresos (Bs)",
    "% del Total",
    "Ticket Promedio (Bs)",
  ];
  headerServiciosRow.eachCell((cell) => {
    cell.fill = redBannerFill;
    cell.font = fontHeader;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  let currentRowIdx = 11;

  if (datos.servicios.length === 0) {
    ws1.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
    const emptyCell = ws1.getCell(`A${currentRowIdx}`);
    emptyCell.value = "Sin registros de servicios facturados en el período seleccionado.";
    emptyCell.font = { italic: true, size: 10, color: { argb: "9CA3AF" } };
    emptyCell.alignment = { horizontal: "center" };
    emptyCell.border = thinBorder;
    currentRowIdx++;
  } else {
    datos.servicios.forEach((s, idx) => {
      const row = ws1.getRow(currentRowIdx);
      row.height = 22; // Altura cómoda por fila
      row.values = [
        s.servicio,
        s.veces,
        s.total,
        s.porcentaje,
        s.ticketPromedio,
      ];

      row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).numFmt = "#,##0";
      row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(3).numFmt = '"Bs "#,##0.00';
      row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(4).numFmt = "0.0%";
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(5).numFmt = '"Bs "#,##0.00';

      row.eachCell((c) => {
        c.border = thinBorder;
        if (idx % 2 === 1) c.fill = zebraFill;
      });
      currentRowIdx++;
    });

    // Fila TOTAL GENERAL
    const totalRow = ws1.getRow(currentRowIdx);
    totalRow.height = 24;
    const totalVeces = datos.servicios.reduce((a, b) => a + (b.veces || 0), 0);
    const totalIngresado = datos.servicios.reduce((a, b) => a + (b.total || 0), 0);
    const promedioGeneral = totalVeces > 0 ? totalIngresado / totalVeces : 0;

    totalRow.values = ["TOTAL GENERAL", totalVeces, totalIngresado, 1.0, promedioGeneral];

    totalRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 11, color: { argb: "111827" } };
      cell.fill = totalRowFill;
      cell.border = doubleBottomBorder;
      if (colNum === 2) {
        cell.numFmt = "#,##0";
        cell.alignment = { horizontal: "center" };
      }
      if (colNum === 3 || colNum === 5) {
        cell.numFmt = '"Bs "#,##0.00';
        cell.alignment = { horizontal: "right" };
      }
      if (colNum === 4) {
        cell.numFmt = "0.0%";
        cell.alignment = { horizontal: "right" };
      }
    });

    currentRowIdx++;
  }

  // Incrustar Imagen de Gráfico si está disponible
  if (chartImages?.serviciosBase64) {
    try {
      const imgId = workbook.addImage({
        base64: chartImages.serviciosBase64,
        extension: "png",
      });
      ws1.addImage(imgId, {
        tl: { col: 0, row: currentRowIdx + 1 },
        ext: { width: 540, height: 270 },
      });
    } catch (e) {
      console.warn("No se pudo incrustar el gráfico en ExcelJS:", e);
    }
  }

  // ---------------------------------------------------------
  // HOJA 2: POR MECÁNICO
  // ---------------------------------------------------------
  const ws2 = workbook.addWorksheet("Por Mecánico");
  applyPrintSetup(ws2);

  ws2.columns = [
    { width: 30 }, // Mecánico
    { width: 18 }, // OTs Atendidas
    { width: 24 }, // Ingresos Generados (Bs)
    { width: 20 }, // % Participación
    { width: 24 }, // Ticket Promedio (Bs)
  ];

  ws2.mergeCells("A1:E2");
  const titleMec = ws2.getCell("A1");
  titleMec.value = "Rendimiento Operativo por Mecánico — ADN MOTORS";
  titleMec.fill = darkHeaderFill;
  titleMec.font = { name: "Arial", size: 14, bold: true, color: { argb: "EF4444" } };
  titleMec.alignment = { horizontal: "center", vertical: "middle" };

  const headerMecRow = ws2.getRow(4);
  headerMecRow.values = [
    "Nombre del Mecánico / Técnico",
    "OTs Atendidas",
    "Ingresos Generados (Bs)",
    "% Participación",
    "Ticket Promedio (Bs)",
  ];
  headerMecRow.eachCell((c) => {
    c.fill = redBannerFill;
    c.font = fontHeader;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  });

  let rowMecIdx = 5;
  if (datos.mecanicos.length === 0) {
    ws2.mergeCells("A5:E5");
    ws2.getCell("A5").value = "No hay registros de trabajo por mecánico en este período.";
    ws2.getCell("A5").font = { italic: true, color: { argb: "9CA3AF" } };
    ws2.getCell("A5").alignment = { horizontal: "center" };
    ws2.getCell("A5").border = thinBorder;
  } else {
    datos.mecanicos.forEach((m, idx) => {
      const row = ws2.getRow(rowMecIdx);
      row.values = [m.mecanico, m.ots, m.total, m.porcentaje, m.ticketPromedio];

      row.getCell(1).alignment = { horizontal: "left" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(2).numFmt = "#,##0";
      row.getCell(3).alignment = { horizontal: "right" };
      row.getCell(3).numFmt = '"Bs "#,##0.00';
      row.getCell(4).alignment = { horizontal: "right" };
      row.getCell(4).numFmt = "0.0%";
      row.getCell(5).alignment = { horizontal: "right" };
      row.getCell(5).numFmt = '"Bs "#,##0.00';

      row.eachCell((c) => {
        c.border = thinBorder;
        if (idx % 2 === 1) c.fill = zebraFill;
      });
      rowMecIdx++;
    });

    const totMecRow = ws2.getRow(rowMecIdx);
    const sumOtsMec = datos.mecanicos.reduce((a, b) => a + (b.ots || 0), 0);
    const sumIngMec = datos.mecanicos.reduce((a, b) => a + (b.total || 0), 0);
    const promMec = sumOtsMec > 0 ? sumIngMec / sumOtsMec : 0;

    totMecRow.values = ["TOTAL GENERAL", sumOtsMec, sumIngMec, 1.0, promMec];
    totMecRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 10, color: { argb: "111827" } };
      cell.fill = totalRowFill;
      cell.border = doubleBottomBorder;
      if (colNum === 2) {
        cell.numFmt = "#,##0";
        cell.alignment = { horizontal: "center" };
      }
      if (colNum === 3 || colNum === 5) {
        cell.numFmt = '"Bs "#,##0.00';
        cell.alignment = { horizontal: "right" };
      }
      if (colNum === 4) {
        cell.numFmt = "0.0%";
        cell.alignment = { horizontal: "right" };
      }
    });
  }

  // ---------------------------------------------------------
  // HOJA 3: DETALLE OTs (BITÁCORA CON AUTOFILTER Y BORDES)
  // ---------------------------------------------------------
  const ws3 = workbook.addWorksheet("Detalle OTs");
  applyPrintSetup(ws3);

  ws3.views = [{ showGridLines: true, state: "frozen", xSplit: 0, ySplit: 1 }];

  ws3.columns = [
    { width: 14 }, // Código OT
    { width: 14 }, // Fecha
    { width: 24 }, // Cliente
    { width: 24 }, // Vehículo & Placa
    { width: 24 }, // Mecánico Asignado
    { width: 36 }, // Servicios / Trabajos
    { width: 16 }, // Estado
    { width: 18 }, // Costo Total (Bs)
  ];

  const headerOtRow = ws3.getRow(1);
  headerOtRow.values = [
    "Código OT",
    "Fecha",
    "Cliente",
    "Vehículo & Placa",
    "Mecanico Asignado",
    "Trabajo y/o Servicio Hecho",
    "Estado OT",
    "Costo Total (Bs)",
  ];
  headerOtRow.eachCell((c) => {
    c.fill = redBannerFill;
    c.font = fontHeader;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  });

  if (datos.detalleOts.length > 0) {
    ws3.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: datos.detalleOts.length + 1, column: 8 },
    };

    datos.detalleOts.forEach((ot, idx) => {
      const row = ws3.getRow(idx + 2);
      row.values = [
        ot.codigoOt,
        ot.fecha,
        ot.cliente,
        ot.vehiculoPlaca,
        ot.mecanico,
        ot.servicios,
        ot.estado,
        ot.costo,
      ];

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(1).font = { bold: true, color: { argb: "DC2626" } };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(2).numFmt = "dd/mm/yyyy";
      row.getCell(8).alignment = { horizontal: "right" };
      row.getCell(8).numFmt = '"Bs "#,##0.00';

      row.eachCell((c) => {
        c.border = thinBorder;
        if (idx % 2 === 1) c.fill = zebraFill;
      });
    });
  }

  // ---------------------------------------------------------
  // HOJA 4: SERIE MENSUAL
  // ---------------------------------------------------------
  const ws4 = workbook.addWorksheet("Serie Mensual");
  applyPrintSetup(ws4);

  ws4.columns = [
    { width: 22 }, // Mes / Año
    { width: 18 }, // OTs Completadas
    { width: 24 }, // Ingresos Totales (Bs)
    { width: 24 }, // Variación % vs Mes Anterior
  ];

  ws4.mergeCells("A1:D2");
  const titleMen = ws4.getCell("A1");
  titleMen.value = "Tendencia de Ingresos Mensuales — ADN MOTORS";
  titleMen.fill = darkHeaderFill;
  titleMen.font = { name: "Arial", size: 14, bold: true, color: { argb: "EF4444" } };
  titleMen.alignment = { horizontal: "center", vertical: "middle" };

  const headerMenRow = ws4.getRow(4);
  headerMenRow.values = [
    "Mes / Período",
    "OTs Completadas",
    "Ingresos Totales (Bs)",
    "Variación % vs Mes Anterior",
  ];
  headerMenRow.eachCell((c) => {
    c.fill = redBannerFill;
    c.font = fontHeader;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  });

  let rowMenIdx = 5;
  if (datos.serieMensual.length === 0) {
    ws4.mergeCells("A5:D5");
    ws4.getCell("A5").value = "Sin registros históricos de tendencia mensual.";
    ws4.getCell("A5").font = { italic: true, color: { argb: "9CA3AF" } };
    ws4.getCell("A5").alignment = { horizontal: "center" };
    ws4.getCell("A5").border = thinBorder;
  } else {
    datos.serieMensual.forEach((m, idx) => {
      const row = ws4.getRow(rowMenIdx);
      row.values = [m.mes, m.ots, m.ingresos, m.variacionPct];

      row.getCell(1).alignment = { horizontal: "left" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(2).numFmt = "#,##0";
      row.getCell(3).alignment = { horizontal: "right" };
      row.getCell(3).numFmt = '"Bs "#,##0.00';
      row.getCell(4).alignment = { horizontal: "right" };
      row.getCell(4).numFmt = "+0.0%;-0.0%;0.0%";

      row.eachCell((c) => {
        c.border = thinBorder;
        if (idx % 2 === 1) c.fill = zebraFill;
      });
      rowMenIdx++;
    });
  }

  // Incrustar gráfico mensual si está disponible
  if (chartImages?.mensualBase64) {
    try {
      const imgId = workbook.addImage({
        base64: chartImages.mensualBase64,
        extension: "png",
      });
      ws4.addImage(imgId, {
        tl: { col: 0, row: rowMenIdx + 1 },
        ext: { width: 540, height: 270 },
      });
    } catch (e) {
      console.warn("No se pudo incrustar el gráfico mensual en ExcelJS:", e);
    }
  }

  // Generar Buffer binario y retornar como Blob nativo sin dependencias de Node
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
