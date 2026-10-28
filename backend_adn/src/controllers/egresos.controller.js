import prisma from '../config/database.js';

export const getEgresos = async (req, res) => {
  try {
    const { categoria, mes, anio, fecha_desde, fecha_hasta, limit = 50, page = 1 } = req.query;

    const where = {};

    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }

    if (fecha_desde && fecha_hasta) {
      where.fecha = {
        gte: new Date(fecha_desde + 'T00:00:00'),
        lte: new Date(fecha_hasta + 'T23:59:59'),
      };
    } else if (mes && anio) {
      const primerDia = new Date(Number(anio), Number(mes) - 1, 1);
      const ultimoDia = new Date(Number(anio), Number(mes), 0, 23, 59, 59);
      where.fecha = {
        gte: primerDia,
        lte: ultimoDia,
      };
    }

    const take = Math.min(Number(limit), 100);
    const skip = (Math.max(Number(page), 1) - 1) * take;

    const [total, egresos] = await Promise.all([
      prisma.egreso.count({ where }),
      prisma.egreso.findMany({
        where,
        take,
        skip,
        orderBy: { fecha: 'desc' },
        include: {
          usuario: { select: { id: true, nombreCompleto: true, email: true } },
          empleado: {
            include: {
              usuario: { select: { nombreCompleto: true, email: true } }
            }
          }
        }
      })
    ]);

    return res.json({
      success: true,
      total,
      pagina: Number(page),
      total_paginas: Math.ceil(total / take),
      egresos: egresos.map(e => ({
        id: e.id,
        descripcion: e.descripcion,
        categoria: e.categoria,
        monto: parseFloat(e.monto),
        fecha: e.fecha.toISOString().split('T')[0],
        metodo_pago: e.metodoPago,
        referencia_comprobante: e.referenciaComprobante,
        comprobante_url: e.comprobanteUrl,
        empleado: e.empleado ? {
          id: e.empleado.id,
          nombre: e.empleado.usuario?.nombreCompleto || 'Mecánico',
          cargo: e.empleado.cargo
        } : null,
        registrado_por: e.usuario?.nombreCompleto || 'Admin',
        observaciones: e.observaciones,
        fecha_reg: e.fechaReg
      }))
    });

  } catch (error) {
    console.error('Error al listar egresos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener egresos' });
  }
};

export const getResumenFinanciero = async (req, res) => {
  try {
    const { mes, anio, fecha_inicio, fecha_fin } = req.query;
    let primerDia, ultimoDia;
    let targetAnio, targetMes;

    if (fecha_inicio && fecha_fin) {
      primerDia = new Date(`${fecha_inicio}T00:00:00.000Z`);
      ultimoDia = new Date(`${fecha_fin}T23:59:59.999Z`);
      targetAnio = primerDia.getFullYear();
      targetMes = primerDia.getMonth() + 1;
    } else {
      const now = new Date();
      targetAnio = anio ? Number(anio) : now.getFullYear();
      targetMes = mes ? Number(mes) : now.getMonth() + 1;
      primerDia = new Date(targetAnio, targetMes - 1, 1);
      ultimoDia = new Date(targetAnio, targetMes, 0, 23, 59, 59);
    }

    // Mes anterior para cálculo comparativo
    const mesAntAnio = targetMes === 1 ? targetAnio - 1 : targetAnio;
    const mesAntNum = targetMes === 1 ? 12 : targetMes - 1;
    const primerDiaAnt = new Date(mesAntAnio, mesAntNum - 1, 1);
    const ultimoDiaAnt = new Date(mesAntAnio, mesAntNum, 0, 23, 59, 59);

    // 1. Ingresos: Facturas emitidas/pagadas en el período
    const [facturasPeriodo, facturasMesAnt, egresosPeriodo, egresosMesAnt] = await Promise.all([
      prisma.factura.findMany({
        where: {
          fechaEmision: { gte: primerDia, lte: ultimoDia },
          estado: { not: 'anulada' }
        },
        select: { total: true }
      }),
      prisma.factura.findMany({
        where: {
          fechaEmision: { gte: primerDiaAnt, lte: ultimoDiaAnt },
          estado: { not: 'anulada' }
        },
        select: { total: true }
      }),
      prisma.egreso.findMany({
        where: {
          fecha: { gte: primerDia, lte: ultimoDia }
        }
      }),
      prisma.egreso.findMany({
        where: {
          fecha: { gte: primerDiaAnt, lte: ultimoDiaAnt }
        }
      })
    ]);

    const totalIngresos = facturasPeriodo.reduce((acc, f) => acc + parseFloat(f.total || 0), 0);
    const totalIngresosAnt = facturasMesAnt.reduce((acc, f) => acc + parseFloat(f.total || 0), 0);

    const totalEgresos = egresosPeriodo.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);
    const totalEgresosAnt = egresosMesAnt.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);

    const utilidadNeta = totalIngresos - totalEgresos;
    const utilidadNetaAnt = totalIngresosAnt - totalEgresosAnt;

    const margenGanancia = totalIngresos > 0
      ? Number(((utilidadNeta / totalIngresos) * 100).toFixed(1))
      : 0;

    // Desglose por categoría
    const categoriasMap = {
      servicios_basicos: { label: 'Servicios Básicos (Luz, Agua, Net)', total: 0, count: 0 },
      sueldos_salarios: { label: 'Sueldos y Adelantos a Personal', total: 0, count: 0 },
      alquiler: { label: 'Alquiler del Taller', total: 0, count: 0 },
      repuestos_insumos: { label: 'Insumos y Líquidos de Taller', total: 0, count: 0 },
      mantenimiento_taller: { label: 'Mantenimiento de Herramientas / Equipos', total: 0, count: 0 },
      impuestos_legales: { label: 'Impuestos y Contabilidad', total: 0, count: 0 },
      otros: { label: 'Otros Gastos / Caja Chica', total: 0, count: 0 }
    };

    egresosPeriodo.forEach(e => {
      const cat = e.categoria;
      const m = parseFloat(e.monto || 0);
      if (categoriasMap[cat]) {
        categoriasMap[cat].total += m;
        categoriasMap[cat].count += 1;
      }
    });

    const desgloseCategorias = Object.entries(categoriasMap).map(([catKey, val]) => ({
      categoria: catKey,
      label: val.label,
      nombre_legible: val.label,
      total: Number(val.total.toFixed(2)),
      count: val.count,
      porcentaje: totalEgresos > 0 ? Number(((val.total / totalEgresos) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.total - a.total);

    return res.json({
      success: true,
      periodo: {
        mes: targetMes,
        anio: targetAnio,
        nombre_mes: new Date(targetAnio, targetMes - 1).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
      },
      metricas: {
        ingresos_totales: Number(totalIngresos.toFixed(2)),
        egresos_totales: Number(totalEgresos.toFixed(2)),
        utilidad_neta: Number(utilidadNeta.toFixed(2)),
        margen_ganancia_porcentaje: margenGanancia,
        comparativa_mes_anterior: {
          ingresos_ant: Number(totalIngresosAnt.toFixed(2)),
          egresos_ant: Number(totalEgresosAnt.toFixed(2)),
          utilidad_ant: Number(utilidadNetaAnt.toFixed(2)),
          crecimiento_ingresos_pct: totalIngresosAnt > 0
            ? Number((((totalIngresos - totalIngresosAnt) / totalIngresosAnt) * 100).toFixed(1))
            : 0,
          variacion_egresos_pct: totalEgresosAnt > 0
            ? Number((((totalEgresos - totalEgresosAnt) / totalEgresosAnt) * 100).toFixed(1))
            : 0
        }
      },
      desglose_categorias: desgloseCategorias,
      distribucion_categorias: desgloseCategorias
    });

  } catch (error) {
    console.error('Error al generar resumen financiero:', error);
    return res.status(500).json({ success: false, error: 'Error al generar balance financiero' });
  }
};

export const crearEgreso = async (req, res) => {
  try {
    const {
      descripcion,
      categoria,
      monto,
      fecha,
      metodo_pago = 'efectivo',
      referencia_comprobante,
      comprobante_url,
      empleado_id,
      observaciones
    } = req.body;

    if (!descripcion || !categoria || !monto || !fecha) {
      return res.status(400).json({
        success: false,
        error: 'Descripción, categoría, monto y fecha son campos obligatorios'
      });
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser un número positivo válido'
      });
    }

    const categoriasValidas = [
      'servicios_basicos',
      'sueldos_salarios',
      'alquiler',
      'repuestos_insumos',
      'mantenimiento_taller',
      'impuestos_legales',
      'otros'
    ];

    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({
        success: false,
        error: `Categoría inválida. Debe ser una de: ${categoriasValidas.join(', ')}`
      });
    }

    const usuarioId = req.user.id;

    const egreso = await prisma.egreso.create({
      data: {
        descripcion: descripcion.trim(),
        categoria,
        monto: montoNum,
        fecha: new Date(fecha + 'T00:00:00'),
        metodoPago: metodo_pago,
        referenciaComprobante: referencia_comprobante?.trim() || null,
        comprobanteUrl: comprobante_url?.trim() || null,
        empleadoId: empleado_id || null,
        usuarioId,
        observaciones: observaciones?.trim() || null
      },
      include: {
        empleado: { include: { usuario: true } }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Egreso registrado exitosamente',
      egreso: {
        id: egreso.id,
        descripcion: egreso.descripcion,
        categoria: egreso.categoria,
        monto: parseFloat(egreso.monto),
        fecha: egreso.fecha.toISOString().split('T')[0],
        metodo_pago: egreso.metodoPago,
        referencia_comprobante: egreso.referenciaComprobante
      }
    });

  } catch (error) {
    console.error('Error al crear egreso:', error);
    return res.status(500).json({ success: false, error: 'Error al registrar el egreso' });
  }
};

export const actualizarEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      descripcion,
      categoria,
      monto,
      fecha,
      metodo_pago,
      referencia_comprobante,
      empleado_id,
      observaciones
    } = req.body;

    const existe = await prisma.egreso.findUnique({ where: { id } });
    if (!existe) {
      return res.status(404).json({ success: false, error: 'Egreso no encontrado' });
    }

    const data = {};
    if (descripcion) data.descripcion = descripcion.trim();
    if (categoria) data.categoria = categoria;
    if (monto) data.monto = parseFloat(monto);
    if (fecha) data.fecha = new Date(fecha + 'T00:00:00');
    if (metodo_pago) data.metodoPago = metodo_pago;
    if (referencia_comprobante !== undefined) data.referenciaComprobante = referencia_comprobante?.trim() || null;
    if (empleado_id !== undefined) data.empleadoId = empleado_id || null;
    if (observaciones !== undefined) data.observaciones = observaciones?.trim() || null;

    const actualizado = await prisma.egreso.update({
      where: { id },
      data
    });

    return res.json({
      success: true,
      message: 'Egreso actualizado correctamente',
      egreso: actualizado
    });

  } catch (error) {
    console.error('Error al actualizar egreso:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar egreso' });
  }
};

export const eliminarEgreso = async (req, res) => {
  try {
    const { id } = req.params;

    const existe = await prisma.egreso.findUnique({ where: { id } });
    if (!existe) {
      return res.status(404).json({ success: false, error: 'Egreso no encontrado' });
    }

    await prisma.egreso.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Egreso eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar egreso:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar egreso' });
  }
};
