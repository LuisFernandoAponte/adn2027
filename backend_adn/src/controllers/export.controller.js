import ExcelJS from 'exceljs';
import prisma from '../config/database.js';

const COMPANY = {
  name: 'ADN MOTORS',
  slogan: 'Taller Automotriz Profesional',
  address: 'Av. Principal #1234, Zona Central',
  phone: 'Tel: (591) 2 1234567',
  email: 'info@adnmotors.com',
  nit: 'NIT: 123456789012',
};

const addHeader = (ws, title, subtitle, numCols = 7) => {
  const colLetter = String.fromCharCode(64 + Math.min(numCols, 26));
  ws.mergeCells(`A1:${colLetter}1`);
  const cell = ws.getCell('A1');
  cell.value = COMPANY.name;
  cell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF1a1a2e' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A2:${colLetter}2`);
  const sub = ws.getCell('A2');
  sub.value = `${title} — ${subtitle}`;
  sub.font = { name: 'Calibri', size: 12, color: { argb: 'FF666666' } };
  sub.alignment = { horizontal: 'center' };

  ws.getRow(3).height = 5;
};

const styleHeaderRow = (ws, row, numCols) => {
  const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
  const font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
  for (let i = 1; i <= numCols; i++) {
    const cell = ws.getCell(row, i);
    cell.fill = fill;
    cell.font = font;
    cell.border = border;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
};

const styleDataRow = (ws, row, numCols) => {
  const border = {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
  const altFill = row % 2 === 0 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5FF' } } : null;
  for (let i = 1; i <= numCols; i++) {
    const cell = ws.getCell(row, i);
    cell.border = border;
    cell.font = { name: 'Calibri', size: 10 };
    if (altFill) cell.fill = altFill;
    cell.alignment = { vertical: 'middle', wrapText: true };
  }
};

const addFooter = (ws, row, numCols = 7) => {
  const r = row + 2;
  const colLetter = String.fromCharCode(64 + Math.min(numCols, 26));
  ws.mergeCells(`A${r}:${colLetter}${r}`);
  const cell = ws.getCell(`A${r}`);
  cell.value = `${COMPANY.name} — ${COMPANY.address} | ${COMPANY.phone} | ${COMPANY.email} | ${COMPANY.nit}`;
  cell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF999999' } };
  cell.alignment = { horizontal: 'center' };
};

const addTotalRow = (ws, row, numCols, label, valueCol, value) => {
  for (let i = 1; i <= numCols; i++) {
    ws.getCell(row, i).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    ws.getCell(row, i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8FF' } };
  }
  ws.getCell(row, 1).value = label;
  ws.getCell(row, 1).font = { bold: true, size: 11 };
  if (valueCol && value !== undefined) {
    ws.getCell(row, valueCol).value = value;
    ws.getCell(row, valueCol).font = { bold: true, size: 11 };
  }
};

const f = (v) => Math.round(Number(v) * 100) / 100;

const SECCIONES = {
  ingresos: 'Ingresos',
  servicios: 'Servicios',
  empleados: 'Empleados',
  citas: 'Citas por Estado',
  clientes: 'Clientes',
  inventario: 'Inventario',
  pagos: 'Pagos',
  transacciones: 'Transacciones',
};

// ==================== SHEET BUILDERS ====================

async function buildIngresos(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Ingresos');
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 10; ws.getColumn(3).width = 15; ws.getColumn(4).width = 12;
  addHeader(ws, 'Reporte de Ingresos', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 4);

  const facturas = await prisma.factura.findMany({
    where: { fechaEmision: { gte: inicio, lte: fin }, estado: { in: ['emitida', 'pagada'] } },
    include: { cita: { include: { detalleServicios: { include: { servicio: true } } } } },
  });

  const porServicio = {};
  let totalGeneral = 0;
  for (const fac of facturas) {
    for (const ds of fac.cita?.detalleServicios || []) {
      const nom = ds.servicio.descripcion;
      if (!porServicio[nom]) porServicio[nom] = { veces: 0, total: 0 };
      porServicio[nom].veces++;
      porServicio[nom].total += Number(ds.servicio.costo);
      totalGeneral += Number(ds.servicio.costo);
    }
  }

  const hRow = 5;
  ['Servicio', 'Veces', 'Total (Bs)', '%'].forEach((h, i) => ws.getCell(hRow, i + 1).value = h);
  styleHeaderRow(ws, hRow, 4);

  let r = hRow + 1;
  for (const [servicio, data] of Object.entries(porServicio).sort((a, b) => b[1].total - a[1].total)) {
    ws.getCell(r, 1).value = servicio;
    ws.getCell(r, 2).value = data.veces;
    ws.getCell(r, 3).value = f(data.total);
    ws.getCell(r, 3).numFmt = '#,##0.00';
    ws.getCell(r, 4).value = totalGeneral > 0 ? parseFloat(((data.total / totalGeneral) * 100).toFixed(1)) : 0;
    styleDataRow(ws, r, 4);
    r++;
  }

  addTotalRow(ws, r + 1, 4, 'TOTAL GENERAL', 3, f(totalGeneral));
  ws.getCell(r + 1, 4).value = 100;
  addFooter(ws, r + 1, 4);
}

async function buildServicios(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Servicios');
  ws.getColumn(1).width = 5; ws.getColumn(2).width = 30; ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 10; ws.getColumn(5).width = 10; ws.getColumn(6).width = 15; ws.getColumn(7).width = 12;
  addHeader(ws, 'Servicios Más Usados', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 7);

  const detalles = await prisma.detalleServicio.findMany({
    where: { cita: { fechaCita: { gte: inicio, lte: fin } } },
    include: { servicio: true },
  });
  const agrupado = {};
  for (const d of detalles) {
    if (!agrupado[d.servicioId]) agrupado[d.servicioId] = { servicio: d.servicio, veces: 0, citas: new Set(), total: 0 };
    agrupado[d.servicioId].veces++;
    agrupado[d.servicioId].citas.add(d.citaId);
    agrupado[d.servicioId].total += Number(d.servicio.costo);
  }

  const hRow = 5;
  ['#', 'Servicio', 'Categoría', 'Veces', 'Citas', 'Total (Bs)', '%'].forEach((h, i) => ws.getCell(hRow, i + 1).value = h);
  styleHeaderRow(ws, hRow, 7);

  let r = hRow + 1;
  const totalServ = Object.values(agrupado).reduce((s, g) => s + g.total, 0);
  for (const [, g] of Object.entries(agrupado).sort((a, b) => b[1].veces - a[1].veces).slice(0, 50)) {
    ws.getCell(r, 1).value = r - hRow;
    ws.getCell(r, 2).value = g.servicio.descripcion;
    ws.getCell(r, 3).value = g.servicio.categoria;
    ws.getCell(r, 4).value = g.veces;
    ws.getCell(r, 5).value = g.citas.size;
    ws.getCell(r, 6).value = f(g.total);
    ws.getCell(r, 6).numFmt = '#,##0.00';
    ws.getCell(r, 7).value = totalServ > 0 ? parseFloat(((g.total / totalServ) * 100).toFixed(1)) : 0;
    styleDataRow(ws, r, 7);
    r++;
  }
  addFooter(ws, r + 1, 7);
}

async function buildEmpleados(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Empleados');
  ws.getColumn(1).width = 25; ws.getColumn(2).width = 15; ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 12; ws.getColumn(5).width = 12; ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 15; ws.getColumn(8).width = 12;
  addHeader(ws, 'Rendimiento de Empleados', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 8);

  const empleados = await prisma.empleado.findMany({
    where: { estado: true },
    include: {
      usuario: true,
      citas: {
        where: { fechaCita: { gte: inicio, lte: fin } },
        include: { factura: true },
      },
    },
  });

  ['Empleado', 'Cargo', 'Citas', 'Completadas', 'Canceladas', '% Complet.', 'Facturado (Bs)', 'Clientes'].forEach((h, i) => ws.getCell(5, i + 1).value = h);
  styleHeaderRow(ws, 5, 8);

  let r = 6;
  for (const e of empleados.sort((a, b) => b.citas.length - a.citas.length)) {
    const total = e.citas.length;
    const comp = e.citas.filter(c => ['Completado', 'Entregado'].includes(c.estado)).length;
    const canc = e.citas.filter(c => c.estado === 'Cancelado').length;
    const fact = e.citas.reduce((s, c) => s + Number(c.factura?.total || 0), 0);
    const clientes = new Set(e.citas.map(c => c.clienteId)).size;
    ws.getCell(r, 1).value = e.usuario.nombreCompleto;
    ws.getCell(r, 2).value = e.cargo;
    ws.getCell(r, 3).value = total;
    ws.getCell(r, 4).value = comp;
    ws.getCell(r, 5).value = canc;
    ws.getCell(r, 6).value = total > 0 ? parseFloat(((comp / total) * 100).toFixed(1)) : 0;
    ws.getCell(r, 7).value = f(fact);
    ws.getCell(r, 7).numFmt = '#,##0.00';
    ws.getCell(r, 8).value = clientes;
    styleDataRow(ws, r, 8);
    r++;
  }
  addFooter(ws, r + 1, 8);
}

async function buildCitas(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Citas por Estado');
  ws.getColumn(1).width = 20; ws.getColumn(2).width = 12; ws.getColumn(3).width = 12;
  addHeader(ws, 'Distribución de Citas', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 3);

  const porEstado = await prisma.cita.groupBy({
    by: ['estado'],
    where: { fechaCita: { gte: inicio, lte: fin } },
    _count: { estado: true },
  });
  const totalCitas = porEstado.reduce((s, e) => s + e._count.estado, 0);

  ['Estado', 'Cantidad', '%'].forEach((h, i) => ws.getCell(5, i + 1).value = h);
  styleHeaderRow(ws, 5, 3);

  let r = 6;
  for (const e of porEstado.sort((a, b) => b._count.estado - a._count.estado)) {
    ws.getCell(r, 1).value = e.estado;
    ws.getCell(r, 2).value = e._count.estado;
    ws.getCell(r, 3).value = totalCitas > 0 ? parseFloat(((e._count.estado / totalCitas) * 100).toFixed(1)) : 0;
    styleDataRow(ws, r, 3);
    r++;
  }

  addTotalRow(ws, r + 1, 3, 'TOTAL', 2, totalCitas);
  ws.getCell(r + 1, 3).value = 100;
  addFooter(ws, r + 1, 3);
}

async function buildClientes(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Clientes');
  ws.getColumn(1).width = 5; ws.getColumn(2).width = 25; ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 12; ws.getColumn(5).width = 10; ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 15; ws.getColumn(8).width = 15;
  addHeader(ws, 'Clientes Frecuentes', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 8);

  const clis = await prisma.cliente.findMany({
    include: {
      usuario: true,
      citas: {
        where: { fechaCita: { gte: inicio, lte: fin } },
        include: { factura: true },
        orderBy: { fechaCita: 'desc' },
      },
    },
  });

  ['#', 'Cliente', 'Email', 'Teléfono', 'Citas', 'Completadas', 'Total Gastado', 'Última Visita'].forEach((h, i) => ws.getCell(5, i + 1).value = h);
  styleHeaderRow(ws, 5, 8);

  let r = 6;
  for (const c of clis.sort((a, b) => b.citas.length - a.citas.length).slice(0, 50)) {
    const comp = c.citas.filter(ci => ['Completado', 'Entregado'].includes(ci.estado)).length;
    const gastado = c.citas.reduce((s, ci) => s + Number(ci.factura?.total || 0), 0);
    ws.getCell(r, 1).value = r - 5;
    ws.getCell(r, 2).value = c.usuario.nombreCompleto;
    ws.getCell(r, 3).value = c.usuario.email;
    ws.getCell(r, 4).value = c.usuario.telefono || '';
    ws.getCell(r, 5).value = c.citas.length;
    ws.getCell(r, 6).value = comp;
    ws.getCell(r, 7).value = f(gastado);
    ws.getCell(r, 7).numFmt = '#,##0.00';
    ws.getCell(r, 8).value = c.citas[0]?.fechaCita ? c.citas[0].fechaCita.toLocaleDateString() : '';
    styleDataRow(ws, r, 8);
    r++;
  }
  addFooter(ws, r + 1, 8);
}

async function buildInventario(workbook) {
  const ws = workbook.addWorksheet('Inventario');
  ws.getColumn(1).width = 15; ws.getColumn(2).width = 30; ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 10; ws.getColumn(5).width = 10; ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14; ws.getColumn(8).width = 20;
  addHeader(ws, 'Inventario Valorizado', 'Estado actual', 8);

  const items = await prisma.inventario.findMany({
    where: { estado: true },
    include: { proveedor: true },
  });

  ['Código', 'Nombre', 'Categoría', 'Stock', 'Mínimo', 'Costo Unit.', 'Valor Total', 'Proveedor'].forEach((h, i) => ws.getCell(5, i + 1).value = h);
  styleHeaderRow(ws, 5, 8);

  let r = 6;
  let valTotal = 0;
  for (const i of items) {
    const valor = Number(i.precioCompra) * i.stockActual;
    valTotal += valor;
    ws.getCell(r, 1).value = i.codigo;
    ws.getCell(r, 2).value = i.nombre;
    ws.getCell(r, 3).value = i.categoria;
    ws.getCell(r, 4).value = i.stockActual;
    ws.getCell(r, 5).value = i.stockMinimo;
    ws.getCell(r, 6).value = f(i.precioCompra);
    ws.getCell(r, 6).numFmt = '#,##0.00';
    ws.getCell(r, 7).value = f(valor);
    ws.getCell(r, 7).numFmt = '#,##0.00';
    ws.getCell(r, 8).value = i.proveedor?.nombre || '';
    styleDataRow(ws, r, 8);
    r++;
  }

  ws.mergeCells(`A${r + 1}:E${r + 1}`);
  addTotalRow(ws, r + 1, 8, 'VALOR TOTAL INVENTARIO', 7, f(valTotal));
  addFooter(ws, r + 1, 8);
}

async function buildPagos(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Pagos');
  ws.getColumn(1).width = 18; ws.getColumn(2).width = 18; ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 14; ws.getColumn(5).width = 18; ws.getColumn(6).width = 14;
  addHeader(ws, 'Registro de Pagos', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 6);

  const pagos = await prisma.pago.findMany({
    where: { fechaPago: { gte: inicio, lte: fin } },
    include: {
      factura: { select: { numeroFactura: true, total: true } },
    },
    orderBy: { fechaPago: 'desc' },
  });

  ['Factura N°', 'Fecha', 'Monto (Bs)', 'Método', 'Referencia', 'Estado'].forEach((h, i) => ws.getCell(5, i + 1).value = h);
  styleHeaderRow(ws, 5, 6);

  let r = 6;
  let totalPagado = 0;
  const porMetodo = {};
  for (const p of pagos) {
    const monto = Number(p.monto);
    totalPagado += monto;
    const metodo = p.metodo || 'efectivo';
    if (!porMetodo[metodo]) porMetodo[metodo] = 0;
    porMetodo[metodo] += monto;

    ws.getCell(r, 1).value = p.factura.numeroFactura;
    ws.getCell(r, 2).value = p.fechaPago ? p.fechaPago.toLocaleDateString() : '';
    ws.getCell(r, 3).value = f(monto);
    ws.getCell(r, 3).numFmt = '#,##0.00';
    ws.getCell(r, 4).value = metodo.charAt(0).toUpperCase() + metodo.slice(1);
    ws.getCell(r, 5).value = p.referencia || '';
    ws.getCell(r, 6).value = (p.estado || 'completado').charAt(0).toUpperCase() + (p.estado || 'completado').slice(1);
    styleDataRow(ws, r, 6);
    r++;
  }

  addTotalRow(ws, r + 1, 6, 'TOTAL PAGADO', 3, f(totalPagado));

  // Summary by method
  r += 3;
  ws.getCell(r, 1).value = 'Resumen por Método de Pago';
  ws.getCell(r, 1).font = { bold: true, size: 11 };
  r++;
  ws.getCell(r, 1).value = 'Método';
  ws.getCell(r, 2).value = 'Total (Bs)';
  ws.getCell(r, 3).value = '%';
  styleHeaderRow(ws, r, 3);
  const hMetodo = r++;

  for (const [metodo, monto] of Object.entries(porMetodo).sort((a, b) => b[1] - a[1])) {
    ws.getCell(r, 1).value = metodo.charAt(0).toUpperCase() + metodo.slice(1);
    ws.getCell(r, 2).value = f(monto);
    ws.getCell(r, 2).numFmt = '#,##0.00';
    ws.getCell(r, 3).value = totalPagado > 0 ? parseFloat(((monto / totalPagado) * 100).toFixed(1)) : 0;
    styleDataRow(ws, r, 3);
    r++;
  }

  addFooter(ws, r + 1, 6);
}

async function buildTransacciones(workbook, inicio, fin) {
  const ws = workbook.addWorksheet('Transacciones');
  ws.getColumn(1).width = 18; ws.getColumn(2).width = 14; ws.getColumn(3).width = 25;
  ws.getColumn(4).width = 12; ws.getColumn(5).width = 10; ws.getColumn(6).width = 14; ws.getColumn(7).width = 14;
  addHeader(ws, 'Registro de Transacciones', `${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()}`, 7);

  const facturas = await prisma.factura.findMany({
    where: { fechaEmision: { gte: inicio, lte: fin } },
    include: {
      cliente: { include: { usuario: true } },
      cita: { include: { empleado: { include: { usuario: true } } } },
      pagos: true,
    },
    orderBy: { fechaEmision: 'desc' },
  });

  ['Factura N°', 'Fecha', 'Cliente', 'Total (Bs)', 'Estado', 'Pagado (Bs)', 'Mecánico'].forEach((h, i) => ws.getCell(5, i + 1).value = h);
  styleHeaderRow(ws, 5, 7);

  let r = 6;
  let totalFacturado = 0;
  let totalCobrado = 0;
  for (const fac of facturas) {
    const total = Number(fac.total);
    const pagado = fac.pagos.filter(p => p.estado === 'completado').reduce((s, p) => s + Number(p.monto), 0);
    totalFacturado += total;
    totalCobrado += pagado;

    ws.getCell(r, 1).value = fac.numeroFactura;
    ws.getCell(r, 2).value = fac.fechaEmision ? fac.fechaEmision.toLocaleDateString() : '';
    ws.getCell(r, 3).value = fac.cliente.usuario.nombreCompleto;
    ws.getCell(r, 4).value = f(total);
    ws.getCell(r, 4).numFmt = '#,##0.00';
    ws.getCell(r, 5).value = (fac.estado || 'emitida').charAt(0).toUpperCase() + (fac.estado || 'emitida').slice(1);
    ws.getCell(r, 6).value = f(pagado);
    ws.getCell(r, 6).numFmt = '#,##0.00';
    ws.getCell(r, 7).value = fac.cita?.empleado?.usuario?.nombreCompleto || '';
    styleDataRow(ws, r, 7);
    r++;
  }

  const tr = r + 1;
  addTotalRow(ws, tr, 7, 'TOTAL FACTURADO', 4, f(totalFacturado));
  ws.getCell(tr, 6).value = f(totalCobrado);
  ws.getCell(tr, 6).font = { bold: true, size: 11 };
  addFooter(ws, tr + 1, 7);
}

// ==================== MAIN ====================

export const exportarReporteExcel = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, secciones } = req.query;
    const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date(Date.now() - 30 * 86400000);
    const fin = fecha_fin ? new Date(fecha_fin) : new Date();

    const seleccionadas = secciones
      ? secciones.split(',').map(s => s.trim().toLowerCase()).filter(s => SECCIONES[s])
      : Object.keys(SECCIONES);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ADN Motors';
    workbook.created = new Date();

    for (const sec of seleccionadas) {
      switch (sec) {
        case 'ingresos': await buildIngresos(workbook, inicio, fin); break;
        case 'servicios': await buildServicios(workbook, inicio, fin); break;
        case 'empleados': await buildEmpleados(workbook, inicio, fin); break;
        case 'citas': await buildCitas(workbook, inicio, fin); break;
        case 'clientes': await buildClientes(workbook, inicio, fin); break;
        case 'inventario': await buildInventario(workbook); break;
        case 'pagos': await buildPagos(workbook, inicio, fin); break;
        case 'transacciones': await buildTransacciones(workbook, inicio, fin); break;
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = secciones
      ? `reporte-${seleccionadas.join('-')}-${new Date().toISOString().split('T')[0]}.xlsx`
      : `reporte-completo-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportar reporte:', error);
    res.status(500).json({ success: false, error: 'Error al exportar reporte' });
  }
};
