import prisma from '../config/database.js';

export const dashboardCompleto = async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query;

    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    let fechaInicioPeriodo = new Date(hoyInicio);
    let fechaInicioAnterior = new Date(hoyInicio);

    if (periodo === 'hoy') {
      fechaInicioPeriodo = new Date(hoyInicio);
      fechaInicioAnterior = new Date(hoyInicio.getTime() - 86400000);
    } else if (periodo === 'semana') {
      const diaSemana = hoyInicio.getDay() === 0 ? 7 : hoyInicio.getDay();
      fechaInicioPeriodo = new Date(hoyInicio.getTime() - (diaSemana - 1) * 86400000);
      fechaInicioAnterior = new Date(fechaInicioPeriodo.getTime() - 7 * 86400000);
    } else if (periodo === '30dias') {
      fechaInicioPeriodo = new Date(hoyInicio.getTime() - 30 * 86400000);
      fechaInicioAnterior = new Date(fechaInicioPeriodo.getTime() - 30 * 86400000);
    } else if (periodo === 'anio') {
      fechaInicioPeriodo = new Date(ahora.getFullYear(), 0, 1);
      fechaInicioAnterior = new Date(ahora.getFullYear() - 1, 0, 1);
    } else {
      // Default: 'mes' (Este Mes)
      fechaInicioPeriodo = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaInicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    }

    // 1. NIVEL 1 — INGRESOS Y EGRESOS DEL PERÍODO (Real + Comparativa % Real)
    const [ingresosActualAgg, ingresosAnteriorAgg, egresosActualAgg, egresosAnteriorAgg, ultimosEgresosList] = await Promise.all([
      prisma.factura.aggregate({
        where: { fechaEmision: { gte: fechaInicioPeriodo }, estado: 'emitida' },
        _sum: { total: true }
      }),
      prisma.factura.aggregate({
        where: { fechaEmision: { gte: fechaInicioAnterior, lt: fechaInicioPeriodo }, estado: 'emitida' },
        _sum: { total: true }
      }),
      prisma.egreso.aggregate({
        where: { fecha: { gte: fechaInicioPeriodo } },
        _sum: { monto: true }
      }),
      prisma.egreso.aggregate({
        where: { fecha: { gte: fechaInicioAnterior, lt: fechaInicioPeriodo } },
        _sum: { monto: true }
      }),
      prisma.egreso.findMany({
        where: { fecha: { gte: fechaInicioPeriodo } },
        orderBy: { fecha: 'desc' },
        take: 6,
        include: { empleado: { include: { usuario: true } } }
      })
    ]);

    const ingresosPeriodoTotal = Number(ingresosActualAgg._sum.total || 0);
    const ingresosAnteriorTotal = Number(ingresosAnteriorAgg._sum.total || 0);
    const egresosPeriodoTotal = Number(egresosActualAgg._sum.monto || 0);
    const egresosAnteriorTotal = Number(egresosAnteriorAgg._sum.monto || 0);

    const utilidadNetaTotal = ingresosPeriodoTotal - egresosPeriodoTotal;
    const margenGananciaPct = ingresosPeriodoTotal > 0
      ? Math.round(((utilidadNetaTotal / ingresosPeriodoTotal) * 100) * 10) / 10
      : 0;

    let variacionPorcentajeReal = 0;
    if (ingresosAnteriorTotal > 0) {
      variacionPorcentajeReal = Math.round(((ingresosPeriodoTotal - ingresosAnteriorTotal) / ingresosAnteriorTotal) * 1000) / 10;
    }

    // 2. ÓRDENES DEL PERÍODO Y VEHÍCULOS EN TALLER
    const [citasPeriodoList, vehiculosEnTallerCount, todasCitasEnTaller] = await Promise.all([
      prisma.cita.findMany({
        where: { fechaCita: { gte: fechaInicioPeriodo } },
        select: { estado: true }
      }),
      prisma.cita.count({
        where: { estado: { in: ['En_taller', 'En_progreso', 'En_revision'] } }
      }),
      prisma.cita.findMany({
        where: { estado: { notIn: ['Entregado', 'Cancelado'] } },
        select: { id: true, estado: true, empleadoId: true, fechaEstimadaEntrega: true, horaFin: true, fechaCita: true }
      })
    ]);

    const ordenesTotalesPeriodo = citasPeriodoList.length;
    const distribucionEstadosPeriodo = {
      Agendadas: citasPeriodoList.filter(c => c.estado === 'Agendado').length,
      En_taller: citasPeriodoList.filter(c => c.estado === 'En_taller').length,
      En_progreso: citasPeriodoList.filter(c => c.estado === 'En_progreso').length,
      Completadas: citasPeriodoList.filter(c => c.estado === 'Completado' || c.estado === 'Entregado').length,
    };

    // 3. PENDIENTE DE COBRO (Real)
    const citasCompletadasSinFactura = await prisma.cita.findMany({
      where: {
        estado: { in: ['Completado', 'Entregado'] },
        factura: { is: null }
      },
      include: {
        detalleServicios: { include: { servicio: true } },
        citasRepuestos: true
      }
    });

    const pendienteCobroTotal = citasCompletadasSinFactura.reduce((acc, c) => {
      const sCosto = c.detalleServicios.reduce((sAcc, s) => sAcc + Number(s.servicio.costo), 0);
      const rCosto = c.citasRepuestos.reduce((rAcc, r) => rAcc + Number(r.subtotal), 0);
      return acc + (sCosto + rCosto);
    }, 0);

    // 4. NIVEL 2 — ESTADO OPERATIVO COMPLETO DEL TALLER Y TENDENCIA DE INGRESOS
    const estadosTallerCounts = {
      Agendado: await prisma.cita.count({ where: { estado: 'Agendado' } }),
      En_taller: await prisma.cita.count({ where: { estado: 'En_taller' } }),
      En_revision: await prisma.cita.count({ where: { estado: 'En_revision' } }),
      En_progreso: await prisma.cita.count({ where: { estado: 'En_progreso' } }),
      Completado: await prisma.cita.count({ where: { estado: 'Completado' } }),
      Entregado: await prisma.cita.count({ where: { estado: 'Entregado' } }),
    };

    // Consulta de tendencia diaria de ingresos para el período seleccionado
    const facturasTendencia = await prisma.factura.findMany({
      where: { fechaEmision: { gte: fechaInicioPeriodo }, estado: 'emitida' },
      orderBy: { fechaEmision: 'asc' }
    });

    const tendenciaMap = {};
    facturasTendencia.forEach(f => {
      const key = f.fechaEmision ? new Date(f.fechaEmision).toISOString().split('T')[0] : 'Hoy';
      tendenciaMap[key] = (tendenciaMap[key] || 0) + Number(f.total);
    });

    const tendenciaIngresosArr = Object.keys(tendenciaMap).map(fechaKey => ({
      fecha: fechaKey,
      total: tendenciaMap[fechaKey]
    }));

    // 5. NIVEL 3 — TRABAJOS QUE REQUIEREN ATENCIÓN (Alertas Operativas Reales)
    const entregasAtrasadasCount = todasCitasEnTaller.filter(c => {
      const estEntrega = c.fechaEstimadaEntrega || c.fechaCita;
      return estEntrega && new Date(estEntrega) < ahora;
    }).length;

    const sinMecanicoCount = todasCitasEnTaller.filter(c => !c.empleadoId).length;
    const enRevisionProlongadaCount = todasCitasEnTaller.filter(c => c.estado === 'En_revision').length;
    const pendientesCobroCount = citasCompletadasSinFactura.length;

    // Próximas entregas (Tabla compacta de máximo 5 filas)
    const proximasEntregasRaw = await prisma.cita.findMany({
      where: { estado: { notIn: ['Entregado', 'Cancelado'] } },
      include: {
        cliente: { include: { usuario: { select: { nombreCompleto: true } }, vehiculos: true } },
        empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
        preReserva: true
      },
      orderBy: [{ fechaCita: 'asc' }, { horaInicio: 'asc' }],
      take: 5
    });

    const proximasEntregas = proximasEntregasRaw.map(c => {
      const veh = c.cliente?.vehiculos?.[0] || (c.preReserva ? { marca: c.preReserva.marcaVehiculo, modelo: c.preReserva.modeloVehiculo, placa: c.preReserva.placa } : null);
      const estEntrega = c.fechaEstimadaEntrega || c.fechaCita;
      let urgencia = 'a_tiempo';
      if (estEntrega && new Date(estEntrega) < ahora) {
        urgencia = 'atrasado';
      } else if (estEntrega && new Date(estEntrega).toDateString() === ahora.toDateString()) {
        urgencia = 'proxima';
      }

      return {
        id: c.id,
        codigo_ot: `OT-${String(c.id).substring(0, 4).toUpperCase()}`,
        cliente: c.cliente?.usuario?.nombreCompleto || c.preReserva?.nombreCompleto || 'Cliente Taller',
        vehiculo: veh ? `${veh.marca || ''} ${veh.modelo || ''} (${veh.placa || 'SIN PLACA'})`.trim() : 'Auto',
        placa: veh?.placa || 'SIN PLACA',
        fecha_entrega: estEntrega,
        estado: c.estado,
        urgencia
      };
    });

    // 6. NIVEL 4 — SERVICIOS MÁS REALIZADOS & ESTADO DEL INVENTARIO
    const topServiciosGroup = await prisma.detalleServicio.groupBy({
      by: ['servicioId'],
      where: { cita: { fechaCita: { gte: fechaInicioPeriodo } } },
      _count: { servicioId: true },
      orderBy: { _count: { servicioId: 'desc' } },
      take: 5
    });

    const serviciosPopulares = await Promise.all(
      topServiciosGroup.map(async (s) => {
        const svc = await prisma.servicio.findUnique({ where: { id: s.servicioId } });
        return { descripcion: svc?.descripcion || 'Servicio General', veces: s._count.servicioId };
      })
    );

    const [totalProductos, productosInventario, productosSinStock, valorInventarioAgg] = await Promise.all([
      prisma.inventario.count({ where: { estado: true } }),
      prisma.inventario.findMany({ where: { estado: true }, select: { stockActual: true, stockMinimo: true } }),
      prisma.inventario.count({ where: { estado: true, stockActual: 0 } }),
      prisma.inventario.aggregate({ where: { estado: true }, _sum: { precioCompra: true } })
    ]);

    const productosStockBajo = productosInventario.filter(i => i.stockActual > 0 && i.stockActual <= i.stockMinimo).length;

    // 7. NIVEL 5 — ACTIVIDAD RECIENTE (Timeline real desde estado_trabajo)
    const actividadRecienteRaw = await prisma.estadoTrabajo.findMany({
      take: 8,
      orderBy: { fechaCambio: 'desc' },
      include: {
        usuario: { select: { nombreCompleto: true } },
        cita: { select: { id: true, clienteId: true } }
      }
    });

    const actividadReciente = actividadRecienteRaw.map(a => ({
      id: a.id,
      codigo_ot: `OT-${String(a.citaId).substring(0, 4).toUpperCase()}`,
      accion: `OT paso a "${a.estado}"`,
      usuario: a.usuario?.nombreCompleto || 'Sistema ADN',
      fecha_hora: a.fechaCambio,
      observaciones: a.observaciones
    }));

    const citasMecanicosRaw = await prisma.cita.findMany({
      where: {
        fechaCita: { gte: fechaInicioPeriodo }
      },
      include: {
        empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
        detalleServicios: { include: { servicio: true } },
        citasRepuestos: true
      }
    });

    const citasMecanicos = citasMecanicosRaw.filter(c => c.empleadoId);

    const mecanicosStatsMap = {};
    citasMecanicos.forEach(c => {
      const mId = c.empleadoId;
      const mNombre = c.empleado?.usuario?.nombreCompleto || 'Mecánico ADN';
      const mCargo = c.empleado?.cargo || 'Mecánico de Taller';

      const sCosto = c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio?.costo || 0), 0);
      const rCosto = c.citasRepuestos.reduce((sum, r) => sum + Number(r.subtotal || 0), 0);
      const totalOt = sCosto + rCosto;

      if (!mecanicosStatsMap[mId]) {
        mecanicosStatsMap[mId] = {
          id: mId,
          nombre: mNombre,
          cargo: mCargo,
          ordenes_completadas: 0,
          total_facturado: 0
        };
      }

      if (c.estado === 'Completado' || c.estado === 'Entregado') {
        mecanicosStatsMap[mId].ordenes_completadas += 1;
        mecanicosStatsMap[mId].total_facturado += totalOt;
      }
    });

    const rankingMecanicosList = Object.values(mecanicosStatsMap)
      .sort((a, b) => b.total_facturado - a.total_facturado);

    const topMecanicoReparaciones = [...rankingMecanicosList].sort((a, b) => b.ordenes_completadas - a.ordenes_completadas)[0] || null;
    const topMecanicoGanancias = rankingMecanicosList[0] || null;

    // 9. HISTÓRICOS GLOBALES DE CLIENTES Y VEHÍCULOS
    const [totalClientesCount, totalVehiculosCount] = await Promise.all([
      prisma.cliente.count(),
      prisma.vehiculo.count({ where: { estado: true } })
    ]);

    return res.json({
      success: true,
      periodo_seleccionado: periodo,
      fecha_actual: ahora,
      nivel1: {
        ingresos_periodo_bob: ingresosPeriodoTotal,
        egresos_periodo_bob: egresosPeriodoTotal,
        utilidad_neta_bob: utilidadNetaTotal,
        margen_ganancia_pct: margenGananciaPct,
        variacion_porcentaje_real: variacionPorcentajeReal,
        ordenes_totales: ordenesTotalesPeriodo,
        ordenes_distribucion: distribucionEstadosPeriodo,
        vehiculos_en_taller: vehiculosEnTallerCount,
        pendiente_cobro_bob: pendienteCobroTotal,
        ultimos_egresos: ultimosEgresosList.map(e => ({
          id: e.id,
          descripcion: e.descripcion,
          categoria: e.categoria,
          monto: Number(e.monto),
          fecha: e.fecha.toISOString().split('T')[0],
          beneficiario: e.empleado?.usuario?.nombreCompleto || null
        }))
      },
      nivel2: {
        estados_taller: estadosTallerCounts,
        tendencia_ingresos: tendenciaIngresosArr
      },
      nivel3: {
        alertas: {
          entregas_atrasadas: entregasAtrasadasCount,
          sin_mecanico: sinMecanicoCount,
          revision_prolongada: enRevisionProlongadaCount,
          pendientes_cobro: pendientesCobroCount,
          total_alertas: entregasAtrasadasCount + sinMecanicoCount + enRevisionProlongadaCount + pendientesCobroCount
        },
        proximas_entregas: proximasEntregas
      },
      nivel4: {
        top_servicios: serviciosPopulares,
        inventario: {
          total_productos: totalProductos,
          valor_total_bob: Number(valorInventarioAgg._sum.precioCompra || 0),
          stock_bajo: productosStockBajo,
          sin_stock: productosSinStock
        }
      },
      ranking_mecanicos: {
        top_reparaciones: topMecanicoReparaciones,
        top_ganancias: topMecanicoGanancias,
        lista_mecanicos: rankingMecanicosList
      },
      nivel5: {
        actividad_reciente: actividadReciente
      },
      nivel6: {
        clientes_registrados: totalClientesCount,
        vehiculos_registrados: totalVehiculosCount
      }
    });

  } catch (error) {
    console.error('Error dashboardCompleto executive:', error);
    return res.status(500).json({ success: false, error: 'Error al generar dashboard ejecutivo: ' + error.message });
  }
};

export const ingresosPeriodo = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date(Date.now() - 30 * 86400000);
    const fin = fecha_fin ? new Date(fecha_fin) : new Date();

    const facturas = await prisma.factura.findMany({
      where: { fechaEmision: { gte: inicio, lte: fin }, estado: 'emitida' },
      include: {
        cita: {
          include: {
            cliente: { include: { usuario: { select: { nombreCompleto: true } } } },
            empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
            detalleServicios: { include: { servicio: true } },
          },
        },
      },
    });

    const ingresosTotales = facturas.reduce((sum, f) => sum + Number(f.total), 0);
    const msDiff = Math.max(fin.getTime() - inicio.getTime(), 86400000);
    const dias = Math.max(Math.ceil(msDiff / 86400000), 1);
    const promedioDiario = ingresosTotales / dias;

    // Citas atendidas / completadas en el período
    const citasAtendidasCount = await prisma.cita.count({
      where: {
        fechaCita: { gte: inicio, lte: fin },
        estado: { in: ['Completado', 'Entregado'] }
      }
    });

    // Clientes atendidos en el período
    const clientesAtendidosIds = new Set(facturas.map(f => f.clienteId).filter(Boolean));
    const clientesAtendidosCount = clientesAtendidosIds.size;

    const serviciosSet = new Set();
    const porServicioMap = {};
    const porMecanicoMap = {};
    const ingresosPorDiaMap = {};
    const gastoPorClienteMap = {};

    let servicioMasSolicitadoObj = { servicio: 'Sin registros', veces: 0 };
    let servicioMayorIngresoObj = { servicio: 'Sin registros', total: 0 };
    let mecanicoMayorFacturacionObj = { mecanico: 'Sin registros', total: 0 };
    let diaMayorIngresosObj = { fecha: 'N/A', total: 0 };
    let clienteMayorGastoObj = { cliente: 'Sin registros', total: 0 };

    for (const f of facturas) {
      const fechaKey = f.fechaEmision ? new Date(f.fechaEmision).toISOString().split('T')[0] : 'Sin fecha';
      ingresosPorDiaMap[fechaKey] = (ingresosPorDiaMap[fechaKey] || 0) + Number(f.total);

      const clienteNombre = f.cita?.cliente?.usuario?.nombreCompleto || 'Cliente Taller';
      gastoPorClienteMap[clienteNombre] = (gastoPorClienteMap[clienteNombre] || 0) + Number(f.total);

      for (const ds of f.cita?.detalleServicios || []) {
        const nombre = ds.servicio.descripcion;
        serviciosSet.add(ds.servicio.id || nombre);

        if (!porServicioMap[nombre]) porServicioMap[nombre] = { servicio: nombre, veces: 0, total: 0 };
        porServicioMap[nombre].veces++;
        porServicioMap[nombre].total += Number(ds.servicio.costo);
      }

      const mecanico = f.cita?.empleado?.usuario?.nombreCompleto || 'Mecánico General';
      if (!porMecanicoMap[mecanico]) porMecanicoMap[mecanico] = { mecanico, trabajos: 0, total_facturado: 0 };
      porMecanicoMap[mecanico].trabajos++;
      porMecanicoMap[mecanico].total_facturado += Number(f.total);
    }

    const serviciosArr = Object.values(porServicioMap)
      .map(s => ({
        ...s,
        porcentaje: ingresosTotales > 0 ? Math.round((s.total / ingresosTotales) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const mecanicosArr = Object.values(porMecanicoMap)
      .map(m => ({
        ...m,
        porcentaje: ingresosTotales > 0 ? Math.round((m.total_facturado / ingresosTotales) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.total_facturado - a.total_facturado);

    if (serviciosArr.length > 0) {
      const masSolicitado = [...serviciosArr].sort((a, b) => b.veces - a.veces)[0];
      servicioMasSolicitadoObj = { servicio: masSolicitado.servicio, veces: masSolicitado.veces };
      servicioMayorIngresoObj = { servicio: serviciosArr[0].servicio, total: serviciosArr[0].total };
    }

    if (mecanicosArr.length > 0) {
      mecanicoMayorFacturacionObj = { mecanico: mecanicosArr[0].mecanico, total: mecanicosArr[0].total_facturado };
    }

    const diasArr = Object.entries(ingresosPorDiaMap).sort((a, b) => b[1] - a[1]);
    if (diasArr.length > 0) {
      diaMayorIngresosObj = { fecha: diasArr[0][0], total: diasArr[0][1] };
    }

    const clientesArr = Object.entries(gastoPorClienteMap).sort((a, b) => b[1] - a[1]);
    if (clientesArr.length > 0) {
      clienteMayorGastoObj = { cliente: clientesArr[0][0], total: clientesArr[0][1] };
    }

    return res.json({
      success: true,
      fecha_inicio: inicio,
      fecha_fin: fin,
      ingresos_totales: ingresosTotales,
      promedio_diario: promedioDiario,
      dias,
      indicadores: {
        ingresos_totales: ingresosTotales,
        promedio_diario: promedioDiario,
        servicios_distintos: serviciosSet.size,
        mecanicos_activos: Object.keys(porMecanicoMap).length,
        citas_atendidas: citasAtendidasCount,
        clientes_atendidos: clientesAtendidosCount
      },
      por_servicio: serviciosArr,
      por_mecanico: mecanicosArr,
      resumen_periodo: {
        servicio_mas_solicitado: servicioMasSolicitadoObj,
        servicio_mayor_ingreso: servicioMayorIngresoObj,
        mecanico_mayor_facturacion: mecanicoMayorFacturacionObj,
        dia_mayor_ingresos: diaMayorIngresosObj,
        cliente_mayor_gasto: clienteMayorGastoObj,
        total_ordenes_completadas: citasAtendidasCount
      }
    });
  } catch (error) {
    console.error('Error ingresos periodo:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener ingresos' });
  }
};

export const serviciosMasUsados = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;
    const fecha_inicio = req.query.fecha_inicio ? new Date(req.query.fecha_inicio) : new Date('2020-01-01');
    const fecha_fin = req.query.fecha_fin ? new Date(req.query.fecha_fin) : new Date();

    const detalle = await prisma.detalleServicio.findMany({
      where: { cita: { fechaCita: { gte: fecha_inicio, lte: fecha_fin } } },
      include: { servicio: { select: { id: true, descripcion: true, categoria: true, costo: true } } },
    });

    const agrupado = {};
    for (const d of detalle) {
      const sid = d.servicio.id;
      if (!agrupado[sid]) agrupado[sid] = { servicio: d.servicio, veces: 0, citas: new Set(), total: 0 };
      agrupado[sid].veces++;
      agrupado[sid].citas.add(d.citaId);
      agrupado[sid].total += Number(d.servicio.costo);
    }

    const servicios = Object.values(agrupado)
      .sort((a, b) => b.veces - a.veces)
      .slice(0, limite)
      .map(g => ({
        servicio: g.servicio.descripcion,
        categoria: g.servicio.categoria,
        veces_usado: g.veces,
        citas: g.citas.size,
        total_generado: g.total,
      }));

    const totalServicios = await prisma.servicio.count({ where: { estado: true } });

    return res.json({ success: true, total_servicios_distintos: totalServicios, servicios });
  } catch (error) {
    console.error('Error servicios mas usados:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener servicios' });
  }
};

export const rendimientoEmpleados = async (req, res) => {
  try {
    const fecha_inicio = req.query.fecha_inicio ? new Date(req.query.fecha_inicio) : new Date(Date.now() - 30 * 86400000);
    const fecha_fin = req.query.fecha_fin ? new Date(req.query.fecha_fin) : new Date();

    const empleados = await prisma.empleado.findMany({
      where: { estado: true },
      include: {
        usuario: { select: { nombreCompleto: true } },
        citas: {
          where: { fechaCita: { gte: fecha_inicio, lte: fecha_fin } },
          include: { factura: { select: { total: true, estado: true } } },
        },
      },
    });

    const resultado = empleados.map(e => {
      const total = e.citas.length;
      const completadas = e.citas.filter(c => ['Completado', 'Entregado'].includes(c.estado)).length;
      const canceladas = e.citas.filter(c => c.estado === 'Cancelado').length;
      const totalFacturado = e.citas.reduce((sum, c) => sum + Number(c.factura?.total || 0), 0);
      const clientesUnicos = new Set(e.citas.map(c => c.clienteId)).size;
      return {
        nombre: e.usuario.nombreCompleto,
        cargo: e.cargo,
        total_citas: total,
        completadas,
        canceladas,
        tasa_completacion: total > 0 ? Math.round((completadas / total) * 1000) / 10 : 0,
        total_facturado: totalFacturado,
        clientes_atendidos: clientesUnicos,
      };
    }).sort((a, b) => b.total_citas - a.total_citas || b.total_facturado - a.total_facturado);

    return res.json({ success: true, fecha_inicio, fecha_fin, empleados: resultado });
  } catch (error) {
    console.error('Error rendimiento empleados:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener rendimiento' });
  }
};

export const citasPorEstado = async (req, res) => {
  try {
    const fecha_inicio = req.query.fecha_inicio ? new Date(req.query.fecha_inicio) : new Date(Date.now() - 30 * 86400000);
    const fecha_fin = req.query.fecha_fin ? new Date(req.query.fecha_fin) : new Date();

    const porEstado = await prisma.cita.groupBy({
      by: ['estado'],
      where: { fechaCita: { gte: fecha_inicio, lte: fecha_fin } },
      _count: { estado: true },
      orderBy: { _count: { estado: 'desc' } },
    });

    const totalCitas = porEstado.reduce((sum, e) => sum + e._count.estado, 0);

    return res.json({
      success: true,
      total_citas: totalCitas,
      por_estado: porEstado.map(e => ({ estado: e.estado, cantidad: e._count.estado })),
    });
  } catch (error) {
    console.error('Error citas por estado:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener citas por estado' });
  }
};

export const inventarioValorizado = async (req, res) => {
  try {
    const items = await prisma.inventario.findMany({
      where: { estado: true },
      select: { codigo: true, nombre: true, categoria: true, stockActual: true, stockMinimo: true, precioCompra: true, precioVenta: true },
    });

    const porCategoria = {};
    let valorTotal = 0;

    for (const i of items) {
      const cat = i.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = { cantidad: 0, total_unidades: 0, valor_compra: 0, valor_venta: 0 };
      porCategoria[cat].cantidad++;
      porCategoria[cat].total_unidades += i.stockActual;
      porCategoria[cat].valor_compra += Number(i.precioCompra) * i.stockActual;
      porCategoria[cat].valor_venta += Number(i.precioVenta) * i.stockActual;
      valorTotal += Number(i.precioCompra) * i.stockActual;
    }

    const stockBajo = items.filter(i => i.stockActual <= i.stockMinimo).sort((a, b) => a.stockActual - b.stockActual).slice(0, 20);

    return res.json({
      success: true,
      total_repuestos: items.length,
      valor_total_inventario: valorTotal,
      por_categoria: Object.entries(porCategoria).map(([k, v]) => ({
        categoria: k, ...v, margen_promedio: v.cantidad > 0 ? Math.round(((v.valor_venta - v.valor_compra) / v.cantidad) * 100) / 100 : 0,
      })).sort((a, b) => b.valor_compra - a.valor_compra),
      stock_bajo: stockBajo.map(i => ({ codigo: i.codigo, nombre: i.nombre, stockActual: i.stockActual, stockMinimo: i.stockMinimo, precioVenta: i.precioVenta })),
    });
  } catch (error) {
    console.error('Error inventario valorizado:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener inventario valorizado' });
  }
};

export const clientesFrecuentes = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;
    const fecha_inicio = req.query.fecha_inicio ? new Date(req.query.fecha_inicio) : new Date('2020-01-01');
    const fecha_fin = req.query.fecha_fin ? new Date(req.query.fecha_fin) : new Date();

    const clientes = await prisma.cliente.findMany({
      include: {
        usuario: { select: { nombreCompleto: true, email: true, telefono: true } },
        citas: {
          where: { fechaCita: { gte: fecha_inicio, lte: fecha_fin } },
          include: { factura: { select: { total: true, estado: true } } },
          orderBy: { fechaCita: 'desc' },
        },
      },
    });

    const resultado = clientes.map(c => {
      const totalCitas = c.citas.length;
      const completadas = c.citas.filter(ci => ['Completado', 'Entregado'].includes(ci.estado)).length;
      const totalGastado = c.citas.reduce((sum, ci) => sum + Number(ci.factura?.total || 0), 0);
      const ultimaCita = c.citas[0]?.fechaCita || null;
      const diasUltima = ultimaCita ? Math.floor((new Date() - new Date(ultimaCita)) / 86400000) : null;
      return {
        nombre: c.usuario.nombreCompleto,
        email: c.usuario.email,
        telefono: c.usuario.telefono,
        total_citas: totalCitas,
        completadas,
        total_gastado: totalGastado,
        ultima_cita: ultimaCita,
        dias_ultima_cita: diasUltima,
      };
    }).sort((a, b) => b.total_citas - a.total_citas || b.total_gastado - a.total_gastado).slice(0, limite);

    const totalActivos = new Set(clientes.filter(c => c.citas.length > 0).map(c => c.id)).size;

    return res.json({ success: true, clientes: resultado, total_clientes_activos: totalActivos });
  } catch (error) {
    console.error('Error clientes frecuentes:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener clientes frecuentes' });
  }
};

export const alertasTaller = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [stockBajo, citasHoyPendientes, preReservasPendientes, vencidas, facturasAnuladas] = await Promise.all([
      prisma.inventario.findMany({
        where: { estado: true, stockActual: { lte: prisma.inventario.fields.stockMinimo } },
        select: { id: true, codigo: true, nombre: true, stockActual: true, stockMinimo: true, categoria: true },
        orderBy: { stockActual: 'asc' },
        take: 10,
      }),
      prisma.cita.count({ where: { fechaCita: hoy, estado: 'Agendado' } }),
      prisma.preReserva.count({ where: { estado: 'PENDIENTE' } }),
      prisma.cita.count({ where: { fechaCita: { lt: hoy }, estado: { notIn: ['Completado', 'Entregado', 'Cancelado'] } } }),
      prisma.factura.count({ where: { estado: 'anulada' } }),
    ]);

    const alertas = [];

    stockBajo.forEach(i => alertas.push({
      tipo: 'stock_bajo',
      severidad: i.stockActual === 0 ? 'critico' : 'advertencia',
      titulo: `Stock bajo: ${i.nombre}`,
      mensaje: `Código ${i.codigo} — Stock actual: ${i.stockActual}, Mínimo: ${i.stockMinimo}`,
      icono: 'package',
      link: `/admin/inventario?id=${i.id}`,
    }));

    if (citasHoyPendientes > 0) alertas.push({
      tipo: 'citas_pendientes',
      severidad: 'info',
      titulo: `${citasHoyPendientes} cita(s) pendiente(s) hoy`,
      mensaje: 'Requieren asignación o inicio de trabajo',
      icono: 'calendar',
      link: '/admin/trabajos',
    });

    if (preReservasPendientes > 0) alertas.push({
      tipo: 'prereservas',
      severidad: 'advertencia',
      titulo: `${preReservasPendientes} pre-reserva(s) sin confirmar`,
      mensaje: 'Clientes que aún no han verificado su pre-reserva',
      icono: 'clock',
      link: null,
    });

    if (vencidas > 0) alertas.push({
      tipo: 'citas_vencidas',
      severidad: 'critico',
      titulo: `${vencidas} cita(s) vencidas sin completar`,
      mensaje: 'Citas de días anteriores que no se completaron ni cancelaron',
      icono: 'alert-triangle',
      link: '/admin/trabajos',
    });

    if (facturasAnuladas > 0) alertas.push({
      tipo: 'facturas_anuladas',
      severidad: 'info',
      titulo: `${facturasAnuladas} factura(s) anulada(s)`,
      mensaje: 'Requieren revisión administrativa',
      icono: 'file-x',
      link: null,
    });

    return res.json({
      success: true,
      total_alertas: alertas.length,
      criticas: alertas.filter(a => a.severidad === 'critico').length,
      advertencias: alertas.filter(a => a.severidad === 'advertencia').length,
      alertas,
    });
  } catch (error) {
    console.error('Error alertas taller:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener alertas' });
  }
};

export const ocupacionTaller = async (req, res) => {
  try {
    const fechaStr = req.query.fecha || new Date().toISOString().split('T')[0];
    const fecha = new Date(fechaStr + 'T00:00:00');

    const empleados = await prisma.empleado.findMany({
      where: { estado: true },
      include: {
        usuario: { select: { nombreCompleto: true } },
        horarios: { where: { diaSemana: fecha.getDay(), activo: true } },
        citas: {
          where: { fechaCita: fecha, estado: { notIn: ['Cancelado'] } },
          select: { horaInicio: true, horaFin: true, estado: true },
        },
      },
    });

    const totalEmpleados = empleados.length;
    const disponibles = empleados.filter(e => e.horarios.length > 0 && e.citas.length === 0);
    const ocupados = empleados.filter(e => e.horarios.length > 0 && e.citas.length > 0);
    const sinHorario = empleados.filter(e => e.horarios.length === 0);
    const enCita = ocupados.filter(e => e.citas.some(c => ['En_taller', 'En_progreso', 'En_revision'].includes(c.estado)));
    const completaron = ocupados.filter(e => e.citas.every(c => ['Completado', 'Entregado'].includes(c.estado)));

    return res.json({
      success: true,
      fecha: fechaStr,
      total_empleados: totalEmpleados,
      ocupados_ahora: enCita.length,
      disponibles,
      completaron_hoy: completaron.length,
      sin_horario: sinHorario.length,
      tasa_ocupacion: totalEmpleados > 0 ? Math.round((enCita.length / totalEmpleados) * 100) : 0,
      detalle: empleados.map(e => ({
        nombre: e.usuario.nombreCompleto,
        cargo: e.cargo,
        tiene_horario: e.horarios.length > 0,
        citas_hoy: e.citas.length,
        estado_actual: e.citas.some(c => ['En_taller', 'En_progreso', 'En_revision'].includes(c.estado)) ? 'ocupado'
          : e.citas.every(c => ['Completado', 'Entregado'].includes(c.estado)) ? 'completo'
          : e.citas.length > 0 ? 'pendiente' : 'disponible',
      })),
    });
  } catch (error) {
    console.error('Error ocupacion taller:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener ocupación' });
  }
};

export const tendenciaIngresos = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const fechaFin = new Date();
    const fechaInicio = new Date(fechaFin.getTime() - dias * 86400000);

    const facturas = await prisma.factura.findMany({
      where: { fechaEmision: { gte: fechaInicio, lte: fechaFin }, estado: 'emitida' },
      select: { total: true, fechaEmision: true },
      orderBy: { fechaEmision: 'asc' },
    });

    const porDia = {};
    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      porDia[key] = 0;
    }

    facturas.forEach(f => {
      const key = new Date(f.fechaEmision).toISOString().split('T')[0];
      if (porDia[key] !== undefined) porDia[key] += Number(f.total);
    });

    const tendencia = Object.entries(porDia).map(([fecha, total]) => ({ fecha, total }));
    const totalPeriodo = facturas.reduce((sum, f) => sum + Number(f.total), 0);
    const promedio = dias > 0 ? totalPeriodo / dias : 0;
    const mejorDia = [...tendencia].sort((a, b) => b.total - a.total)[0] || null;

    return res.json({
      success: true,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      total_ingresos: totalPeriodo,
      promedio_diario: Math.round(promedio * 100) / 100,
      mejor_dia: mejorDia,
      tendencia,
    });
  } catch (error) {
    console.error('Error tendencia ingresos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener tendencia de ingresos' });
  }
};

export const timelineActividad = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 20;

    const [citasRecientes, estadosCambiados, facturasRecientes] = await Promise.all([
      prisma.cita.findMany({
        orderBy: { fechaReg: 'desc' },
        take: limite,
        include: {
          cliente: { include: { usuario: { select: { nombreCompleto: true } } } },
          empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
        },
      }),
      prisma.estadoTrabajo.findMany({
        orderBy: { fechaCambio: 'desc' },
        take: limite,
        include: {
          usuario: { select: { nombreCompleto: true } },
          cita: { select: { id: true } },
        },
      }),
      prisma.factura.findMany({
        orderBy: { fechaEmision: 'desc' },
        take: limite,
        include: {
          cita: { select: { id: true } },
          usuario: { select: { nombreCompleto: true } },
          cliente: { include: { usuario: { select: { nombreCompleto: true } } } },
        },
      }),
    ]);

    const eventos = [];

    citasRecientes.forEach(c => {
      eventos.push({
        tipo: 'cita_creada',
        fecha: c.fechaReg,
        titulo: 'Nueva cita agendada',
        descripcion: `${c.cliente?.usuario?.nombreCompleto || 'N/A'} con ${c.empleado?.usuario?.nombreCompleto || 'N/A'}`,
        enlace: `/admin/trabajos?id=${c.id}`,
      });
    });

    estadosCambiados.forEach(e => {
      eventos.push({
        tipo: 'estado_cambiado',
        fecha: e.fechaCambio,
        titulo: `Cita → ${e.estado}`,
        descripcion: `Cambio por ${e.usuario?.nombreCompleto || 'N/A'}`,
        enlace: `/admin/trabajos?id=${e.cita?.id}`,
      });
    });

    facturasRecientes.forEach(f => {
      eventos.push({
        tipo: 'factura_emitida',
        fecha: f.fechaEmision,
        titulo: `Factura #${f.numeroFactura}`,
        descripcion: `${f.cliente?.usuario?.nombreCompleto || 'N/A'} — BOB ${Number(f.total).toFixed(2)}`,
        enlace: null,
      });
    });

    eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const timeline = eventos.slice(0, limite);

    return res.json({ success: true, timeline });
  } catch (error) {
    console.error('Error timeline actividad:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener timeline' });
  }
};

export const productividadTaller = async (req, res) => {
  try {
    const fecha_inicio = req.query.fecha_inicio ? new Date(req.query.fecha_inicio) : new Date(Date.now() - 30 * 86400000);
    const fecha_fin = req.query.fecha_fin ? new Date(req.query.fecha_fin) : new Date();

    const citas = await prisma.cita.findMany({
      where: { fechaCita: { gte: fecha_inicio, lte: fecha_fin }, estado: { in: ['Completado', 'Entregado'] } },
      include: {
        detalleServicios: { include: { servicio: true } },
        empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
      },
    });

    const totalCitas = citas.length;
    const totalServicios = citas.reduce((sum, c) => sum + c.detalleServicios.length, 0);
    const serviciosPorCita = totalCitas > 0 ? (totalServicios / totalCitas).toFixed(1) : 0;
    const costoPromedio = totalCitas > 0
      ? citas.reduce((sum, c) => sum + c.detalleServicios.reduce((s, ds) => s + Number(ds.servicio.costo), 0), 0) / totalCitas
      : 0;

    const porServicio = {};
    citas.forEach(c => c.detalleServicios.forEach(ds => {
      const nom = ds.servicio.descripcion;
      if (!porServicio[nom]) porServicio[nom] = { count: 0, total: 0 };
      porServicio[nom].count++;
      porServicio[nom].total += Number(ds.servicio.costo);
    }));

    return res.json({
      success: true,
      fecha_inicio,
      fecha_fin,
      total_citas_completadas: totalCitas,
      total_servicios_realizados: totalServicios,
      servicios_por_cita: parseFloat(serviciosPorCita),
      costo_promedio_por_cita: Math.round(costoPromedio * 100) / 100,
      servicios_mas_comunes: Object.entries(porServicio)
        .map(([k, v]) => ({ servicio: k, veces: v.count, total: v.total }))
        .sort((a, b) => b.veces - a.veces)
        .slice(0, 10),
    });
  } catch (error) {
    console.error('Error productividad taller:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener productividad' });
  }
};

export const obtenerDatosReporteCompleto = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const ahora = new Date();
    
    let fInicio = fecha_inicio ? new Date(`${fecha_inicio}T00:00:00`) : new Date(ahora.getTime() - 30 * 86400000);
    let fFin = fecha_fin ? new Date(`${fecha_fin}T23:59:59`) : ahora;

    if (isNaN(fInicio.getTime())) fInicio = new Date(ahora.getTime() - 30 * 86400000);
    if (isNaN(fFin.getTime())) fFin = ahora;

    // Generar Folio Único de Auditoría
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const folio = `FOL-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}-${randomHex}`;

    // Consultar Citas / OTs en el rango
    const citas = await prisma.cita.findMany({
      where: {
        fechaCita: { gte: fInicio, lte: fFin }
      },
      include: {
        cliente: {
          include: {
            usuario: { select: { nombreCompleto: true } },
            vehiculos: true
          }
        },
        empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
        detalleServicios: { include: { servicio: true } },
        citasRepuestos: true,
        factura: true
      },
      orderBy: { fechaCita: 'asc' }
    });

    // 1. Agregación Por Servicio & Repuestos
    const serviciosMap = {};
    let ingresoTotalServicios = 0;
    let ingresoTotalRepuestos = 0;
    let totalVecesRepuestos = 0;

    citas.forEach(c => {
      c.detalleServicios.forEach(ds => {
        const nom = ds.servicio.descripcion;
        const costoServ = Number(ds.servicio.costo || 0);
        if (!serviciosMap[nom]) {
          serviciosMap[nom] = { servicio: nom, veces: 0, total: 0 };
        }
        serviciosMap[nom].veces += 1;
        serviciosMap[nom].total += costoServ;
        ingresoTotalServicios += costoServ;
      });

      c.citasRepuestos.forEach(cr => {
        const sub = Number(cr.subtotal || 0);
        ingresoTotalRepuestos += sub;
        totalVecesRepuestos += (cr.cantidad || 1);
      });
    });

    if (ingresoTotalRepuestos > 0) {
      serviciosMap['Repuestos e Insumos Taller'] = {
        servicio: 'Repuestos e Insumos Taller',
        veces: totalVecesRepuestos,
        total: ingresoTotalRepuestos
      };
      ingresoTotalServicios += ingresoTotalRepuestos;
    }

    const porServicio = Object.values(serviciosMap).map(s => {
      const porcentaje = ingresoTotalServicios > 0 ? s.total / ingresoTotalServicios : 0;
      const ticketPromedio = s.veces > 0 ? s.total / s.veces : 0;
      return {
        servicio: s.servicio,
        veces: s.veces,
        total: Math.round(s.total * 100) / 100,
        porcentaje: Math.round(porcentaje * 10000) / 10000,
        ticketPromedio: Math.round(ticketPromedio * 100) / 100
      };
    }).sort((a, b) => b.total - a.total);

    // 2. Agregación Por Mecánico
    const mecanicosMap = {};
    let ingresoTotalMecanicos = 0;

    citas.forEach(c => {
      const mecNombre = c.empleado?.usuario?.nombreCompleto || 'Sin Mecánico Asignado';
      const cServCosto = c.detalleServicios.reduce((acc, s) => acc + Number(s.servicio.costo || 0), 0);
      const cRepCosto = c.citasRepuestos.reduce((acc, r) => acc + Number(r.subtotal || 0), 0);
      const cTotal = cServCosto + cRepCosto;

      if (!mecanicosMap[mecNombre]) {
        mecanicosMap[mecNombre] = { mecanico: mecNombre, ots: 0, total: 0 };
      }
      mecanicosMap[mecNombre].ots += 1;
      mecanicosMap[mecNombre].total += cTotal;
      ingresoTotalMecanicos += cTotal;
    });

    const porMecanico = Object.values(mecanicosMap).map(m => {
      const porcentaje = ingresoTotalMecanicos > 0 ? m.total / ingresoTotalMecanicos : 0;
      const ticketPromedio = m.ots > 0 ? m.total / m.ots : 0;
      return {
        mecanico: m.mecanico,
        ots: m.ots,
        total: Math.round(m.total * 100) / 100,
        porcentaje: Math.round(porcentaje * 10000) / 10000,
        ticketPromedio: Math.round(ticketPromedio * 100) / 100
      };
    }).sort((a, b) => b.total - a.total);

    // Total General Unificado (Garantiza Coincidencia Cross-Check)
    const ingresoTotalGeneral = Math.round(
      citas.reduce((acc, c) => {
        const sCosto = c.detalleServicios.reduce((sAcc, s) => sAcc + Number(s.servicio.costo || 0), 0);
        const rCosto = c.citasRepuestos.reduce((rAcc, r) => rAcc + Number(r.subtotal || 0), 0);
        return acc + (sCosto + rCosto);
      }, 0) * 100
    ) / 100;

    // Recalcular % de Servicios sobre ingresoTotalGeneral para sincronización perfecta
    if (ingresoTotalGeneral > 0) {
      porServicio.forEach(s => {
        s.porcentaje = Math.round((s.total / ingresoTotalGeneral) * 10000) / 10000;
      });
      porMecanico.forEach(m => {
        m.porcentaje = Math.round((m.total / ingresoTotalGeneral) * 10000) / 10000;
      });
    }

    // 3. Detalle OTs
    const detalleOts = citas.map(c => {
      const sCosto = c.detalleServicios.reduce((sAcc, s) => sAcc + Number(s.servicio.costo || 0), 0);
      const rCosto = c.citasRepuestos.reduce((rAcc, r) => rAcc + Number(r.subtotal || 0), 0);
      const cTotal = sCosto + rCosto;

      const nomCliente = c.cliente?.usuario?.nombreCompleto || 'Cliente Sin Registrar';
      const primerVeh = c.cliente?.vehiculos?.[0];
      const vehPlaca = primerVeh ? `${primerVeh.marca} ${primerVeh.modelo} (${primerVeh.placa})` : 'Vehículo General';
      const nomMecanico = c.empleado?.usuario?.nombreCompleto || 'Sin Mecánico';
      const desServicios = c.detalleServicios.map(s => s.servicio.descripcion).join(', ') || 'General';

      return {
        codigoOt: `OT-${String(c.id).padStart(4, '0')}`,
        fecha: new Date(c.fechaCita).toLocaleDateString('es-BO'),
        cliente: nomCliente,
        vehiculoPlaca: vehPlaca,
        mecanico: nomMecanico,
        servicios: desServicios,
        estado: c.estado,
        costo: Math.round(cTotal * 100) / 100
      };
    });

    // 4. Serie Mensual
    const mesesMap = {};
    citas.forEach(c => {
      const d = new Date(c.fechaCita);
      const keyMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nomMes = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(d);
      
      const sCosto = c.detalleServicios.reduce((sAcc, s) => sAcc + Number(s.servicio.costo || 0), 0);
      const rCosto = c.citasRepuestos.reduce((rAcc, r) => rAcc + Number(r.subtotal || 0), 0);
      const cTotal = sCosto + rCosto;

      if (!mesesMap[keyMes]) {
        mesesMap[keyMes] = { key: keyMes, mes: nomMes, ots: 0, ingresos: 0 };
      }
      mesesMap[keyMes].ots += 1;
      mesesMap[keyMes].ingresos += cTotal;
    });

    const serieMensual = Object.values(mesesMap).sort((a, b) => a.key.localeCompare(b.key)).map((m, idx, arr) => {
      let variacionPct = 0;
      if (idx > 0 && arr[idx - 1].ingresos > 0) {
        variacionPct = (m.ingresos - arr[idx - 1].ingresos) / arr[idx - 1].ingresos;
      }
      return {
        mes: m.mes.charAt(0).toUpperCase() + m.mes.slice(1),
        ots: m.ots,
        ingresos: Math.round(m.ingresos * 100) / 100,
        variacionPct: Math.round(variacionPct * 10000) / 10000
      };
    });

    const totalOts = citas.length;
    const ticketPromedio = totalOts > 0 ? ingresoTotalGeneral / totalOts : 0;
    const servicioTop = porServicio.length > 0 ? porServicio[0].servicio : 'N/A';
    const mecanicoTop = porMecanico.length > 0 ? porMecanico[0].mecanico : 'N/A';
    const mejorMesObj = serieMensual.length > 0 ? [...serieMensual].sort((a, b) => b.ingresos - a.ingresos)[0] : null;
    const mejorMes = mejorMesObj ? mejorMesObj.mes : 'N/A';

    return res.json({
      success: true,
      meta: {
        titulo: "REPORTE CONTABLE Y OPERATIVO ADN MOTORS",
        periodoDesde: fInicio.toLocaleDateString('es-BO'),
        periodoHasta: fFin.toLocaleDateString('es-BO'),
        fechaGeneracion: ahora.toLocaleString('es-BO'),
        generadoPor: req.usuario?.nombreCompleto || 'Administrador ADN',
        rolUsuario: req.usuario?.rol || 'Administrador',
        folio,
        tallerInfo: {
          nombre: "ADN MOTORS — CENTRO AUTOMOTRIZ INTEGRAL",
          nit: "1029384756",
          direccion: "Av. América #123, Cochabamba, Bolivia",
          telefono: "+591 4 4123456",
          email: "contacto@adnmotors.com"
        }
      },
      datos: {
        kpis: {
          ingresoTotal: ingresoTotalGeneral,
          otsCompletadas: totalOts,
          ticketPromedio: Math.round(ticketPromedio * 100) / 100,
          servicioTop,
          mecanicoTop,
          mejorMes
        },
        servicios: porServicio,
        mecanicos: porMecanico,
        detalleOts,
        serieMensual
      }
    });

  } catch (error) {
    console.error("Error al obtener reporte completo:", error);
    return res.status(500).json({ success: false, error: "Error interno al procesar reporte completo" });
  }
};
