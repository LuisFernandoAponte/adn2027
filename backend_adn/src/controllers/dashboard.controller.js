import prisma from '../config/database.js';
import { dashboardCompleto } from './reportes.controller.js';

export const getCompleto = async (req, res) => {
  return dashboardCompleto(req, res);
};

export const getStats = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const totalCitas = await prisma.cita.count();

    const completados = await prisma.cita.count({
      where: { estado: { in: ['Completado', 'Entregado'] } }
    });

    const enProceso = await prisma.cita.count({
      where: { estado: { in: ['En_taller', 'En_progreso', 'En_revision'] } }
    });

    const pendientes = await prisma.cita.count({
      where: { estado: 'Agendado' }
    });

    const totalClientes = await prisma.cliente.count();

    const ingresosFacturas = await prisma.factura.aggregate({
      where: {
        fechaEmision: { gte: hoy, lt: new Date(hoy.getTime() + 86400000) }
      },
      _sum: { total: true }
    });

    const empleadosConMasTrabajos = await prisma.cita.groupBy({
      by: ['empleadoId'],
      where: {
        fechaCita: { gte: inicioMes }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });

    let topMecanico = null;

    if (empleadosConMasTrabajos.length > 0) {
      const emp = await prisma.empleado.findUnique({
        where: { id: empleadosConMasTrabajos[0].empleadoId },
        include: { usuario: { select: { nombreCompleto: true } } }
      });

      if (emp) {
        topMecanico = {
          nombre: emp.usuario.nombreCompleto,
          trabajos: empleadosConMasTrabajos[0]._count.id
        };
      }
    }

    return res.json({
      totalIngresos: Number(ingresosFacturas._sum.total || 0),
      totalCitas,
      completados,
      enProceso,
      pendientes,
      totalClientes,
      topMecanico
    });

  } catch (error) {
    console.error('Error getStats:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

export const getRecentServices = async (req, res) => {
  try {
    const citas = await prisma.cita.findMany({
      include: {
        cliente: { include: { usuario: true } },
        empleado: { include: { usuario: true } },
        detalleServicios: { include: { servicio: true } }
      },
      orderBy: { fechaReg: 'desc' },
      take: 10
    });

    const resultado = citas.map(c => ({
      id: c.id,
      fecha_cita: c.fechaCita,
      estado: c.estado === 'En_taller' ? 'En taller' : c.estado === 'En_progreso' ? 'En progreso' : c.estado === 'En_revision' ? 'En revisión' : c.estado,
      cliente: c.cliente?.usuario?.nombreCompleto || 'N/A',
      mecanico: c.empleado?.usuario?.nombreCompleto || 'N/A',
      servicios: c.detalleServicios.map(s => s.servicio.descripcion).join(', '),
      costo_total: c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio.costo), 0)
    }));

    return res.json(resultado);

  } catch (error) {
    console.error('Error getRecentServices:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener servicios recientes' });
  }
};

export const getTendenciaIngresos = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - dias);

    const facturas = await prisma.factura.findMany({
      where: {
        fechaEmision: { gte: inicio },
        estado: 'emitida'
      },
      orderBy: { fechaEmision: 'asc' }
    });

    const tendencia = {};
    facturas.forEach(f => {
      const key = f.fechaEmision.toISOString().split('T')[0];
      tendencia[key] = (tendencia[key] || 0) + Number(f.total);
    });

    const result = [];
    let mejorDia = null;
    let total = 0;
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const val = tendencia[key] || 0;
      total += val;
      result.push({ fecha: key, total: val });
      if (!mejorDia || val > mejorDia.total) {
        mejorDia = { fecha: key, total: val };
      }
    }

    return res.json({
      success: true,
      fecha_inicio: inicio.toISOString(),
      fecha_fin: hoy.toISOString(),
      total_ingresos: total,
      promedio_diario: dias > 0 ? total / dias : 0,
      mejor_dia: mejorDia?.total > 0 ? mejorDia : null,
      tendencia: result
    });
  } catch (error) {
    console.error('Error getTendenciaIngresos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener tendencia ingresos' });
  }
};

export const getTimeline = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 15;
    const eventos = [];

    const citasRecientes = await prisma.cita.findMany({
      include: {
        cliente: { include: { usuario: { select: { nombreCompleto: true } } } },
      },
      orderBy: { fechaReg: 'desc' },
      take: limite
    });

    citasRecientes.forEach(c => {
      eventos.push({
        tipo: 'cita',
        fecha: c.fechaReg?.toISOString() || new Date().toISOString(),
        titulo: `Nueva cita agendada`,
        descripcion: `${c.cliente?.usuario?.nombreCompleto || 'Cliente'} - ${c.estado}`,
        enlace: `/admin/trabajos/${c.id}`
      });
    });

    const movimientos = await prisma.movimientoInventario.findMany({
      include: {
        inventario: { select: { nombre: true } },
        usuario: { select: { nombreCompleto: true } }
      },
      orderBy: { fechaReg: 'desc' },
      take: limite
    });

    movimientos.forEach(m => {
      eventos.push({
        tipo: m.tipo === 'entrada' ? 'entrada' : m.tipo === 'salida' ? 'salida' : 'ajuste',
        fecha: m.fechaReg?.toISOString() || new Date().toISOString(),
        titulo: `Movimiento de inventario: ${m.tipo}`,
        descripcion: `${m.inventario?.nombre || 'Repuesto'} - ${m.cantidad > 0 ? '+' : ''}${m.cantidad} (${m.usuario?.nombreCompleto || 'Sistema'})`,
        enlace: `/admin/inventario`
      });
    });

    eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const timeline = eventos.slice(0, limite);

    return res.json({ success: true, timeline });
  } catch (error) {
    console.error('Error getTimeline:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener timeline' });
  }
};

export const getAlertas = async (req, res) => {
  try {
    const alertas = [];
    let criticas = 0;
    let advertencias = 0;

    const stockBajo = await prisma.inventario.findMany({
      where: { stockActual: { lte: prisma.inventario.fields.stockMinimo }, estado: true },
      orderBy: { stockActual: 'asc' },
      take: 5
    });

    stockBajo.forEach(i => {
      const esCritico = i.stockActual === 0;
      if (esCritico) criticas++;
      else advertencias++;
      alertas.push({
        tipo: 'stock_bajo',
        severidad: esCritico ? 'critica' : 'advertencia',
        titulo: `Stock bajo: ${i.nombre}`,
        mensaje: `Stock actual: ${i.stockActual}, mínimo: ${i.stockMinimo}`,
        icono: 'package',
        link: '/admin/inventario'
      });
    });

    const citasSinAsignar = await prisma.cita.count({
      where: { empleadoId: null, estado: 'Agendado' }
    });

    if (citasSinAsignar > 0) {
      advertencias++;
      alertas.push({
        tipo: 'citas_sin_asignar',
        severidad: 'advertencia',
        titulo: 'Citas sin mecanico asignado',
        mensaje: `${citasSinAsignar} cita(s) esperan asignación`,
        icono: 'calendar',
        link: '/admin/trabajos'
      });
    }

    return res.json({
      success: true,
      total_alertas: alertas.length,
      criticas,
      advertencias,
      alertas
    });
  } catch (error) {
    console.error('Error getAlertas:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener alertas' });
  }
};

export const getProductividad = async (req, res) => {
  try {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const completadas = await prisma.cita.findMany({
      where: {
        estado: { in: ['Completado', 'Entregado'] },
        fechaCita: { gte: inicioMes }
      },
      include: {
        detalleServicios: { include: { servicio: true } }
      }
    });

    const totalServicios = completadas.reduce((sum, c) => sum + c.detalleServicios.length, 0);
    const costos = completadas.map(c =>
      c.detalleServicios.reduce((s, ds) => s + Number(ds.servicio.costo), 0)
    );
    const costoPromedio = completadas.length > 0
      ? costos.reduce((a, b) => a + b, 0) / completadas.length
      : 0;

    const servicioConteo = {};
    completadas.forEach(c => {
      c.detalleServicios.forEach(ds => {
        const key = ds.servicio.descripcion;
        if (!servicioConteo[key]) servicioConteo[key] = { veces: 0, total: 0 };
        servicioConteo[key].veces++;
        servicioConteo[key].total += Number(ds.servicio.costo);
      });
    });

    const serviciosMasComunes = Object.entries(servicioConteo)
      .map(([servicio, data]) => ({ servicio, veces: data.veces, total: data.total }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 5);

    return res.json({
      success: true,
      total_citas_completadas: completadas.length,
      total_servicios_realizados: totalServicios,
      servicios_por_cita: completadas.length > 0 ? totalServicios / completadas.length : 0,
      costo_promedio_por_cita: costoPromedio,
      servicios_mas_comunes: serviciosMasComunes
    });
  } catch (error) {
    console.error('Error getProductividad:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener productividad' });
  }
};

export const getOcupacion = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const empleados = await prisma.empleado.findMany({
      where: { estado: true },
      include: {
        usuario: { select: { nombreCompleto: true } },
        horarios: { select: { id: true } },
        citas: {
          where: { fechaCita: { gte: hoy, lt: manana } },
          select: { id: true, estado: true }
        }
      }
    });

    const ocupadosAhora = empleados.filter(e =>
      e.citas.some(c => ['En_taller', 'En_progreso', 'En_revision'].includes(c.estado))
    ).length;

    const disponibles = empleados.filter(e =>
      !e.citas.some(c => ['En_taller', 'En_progreso', 'En_revision'].includes(c.estado)) &&
      e.horarios.length > 0
    ).length;

    const completaronHoy = empleados.filter(e =>
      e.citas.some(c => c.estado === 'Completado' || c.estado === 'Entregado')
    ).length;

    const sinHorario = empleados.filter(e => e.horarios.length === 0).length;

    const tasaOcupacion = empleados.length > 0
      ? Math.round((ocupadosAhora / empleados.length) * 100)
      : 0;

    const detalle = empleados.map(e => ({
      nombre: e.usuario.nombreCompleto,
      cargo: e.cargo,
      tiene_horario: e.horarios.length > 0,
      citas_hoy: e.citas.length,
      estado_actual: e.citas.some(c => ['En_taller', 'En_progreso', 'En_revision'].includes(c.estado))
        ? 'Ocupado'
        : e.citas.length > 0 ? 'Con citas' : 'Disponible'
    }));

    return res.json({
      success: true,
      total_empleados: empleados.length,
      ocupados_ahora: ocupadosAhora,
      disponibles,
      completaron_hoy: completaronHoy,
      sin_horario: sinHorario,
      tasa_ocupacion: tasaOcupacion,
      detalle
    });
  } catch (error) {
    console.error('Error getOcupacion:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener ocupación' });
  }
};
