import prisma from '../config/database.js';
import { config } from '../config/index.js';

// ─────────────────────────────────────────────
// GET /api/appointments — Listar citas con filtros
// ─────────────────────────────────────────────
export const listarAppointments = async (req, res) => {
  try {
    const {
      estado, fecha_desde, fecha_hasta, empleado_id, cliente_id, page, limit,
    } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (fecha_desde || fecha_hasta) {
      where.fechaCita = {};
      if (fecha_desde) where.fechaCita.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fechaCita.lte = new Date(fecha_hasta);
    }
    if (empleado_id) where.empleadoId = empleado_id;
    if (cliente_id) where.clienteId = cliente_id;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [citas, total] = await Promise.all([
      prisma.cita.findMany({
        where,
        include: {
          cliente: { include: { usuario: { select: { nombreCompleto: true, email: true, telefono: true } } } },
          empleado: { include: { usuario: { select: { nombreCompleto: true } } } },
          detalleServicios: { include: { servicio: { select: { descripcion: true, costo: true, categoria: true } } } },
          factura: { select: { id: true, numeroFactura: true, total: true, estado: true } },
        },
        orderBy: { fechaCita: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.cita.count({ where }),
    ]);

    return res.json({
      success: true,
      data: citas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listarAppointments:', error);
    return res.status(500).json({ success: false, error: 'Error al listar citas' });
  }
};

// ─────────────────────────────────────────────
// POST /api/appointments — Crear cita (usa cita_agendar)
// ─────────────────────────────────────────────
export const crearAppointment = async (req, res) => {
  try {
    const { cliente_id, empleado_id, fecha_cita, hora_inicio, hora_fin, servicios, observaciones, tipo_servicio } = req.body;

    if (!cliente_id || !empleado_id || !fecha_cita || !hora_inicio || !hora_fin || !servicios?.length) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: cliente_id, empleado_id, fecha_cita, hora_inicio, hora_fin, servicios' });
    }

    const result = await prisma.$queryRawUnsafe(`
      SELECT cita_agendar(
        $1::uuid, $2::uuid, $3::date, $4::time, $5::time,
        $6::uuid[], $7::text, $8::text
      ) AS result
    `, cliente_id, empleado_id, new Date(fecha_cita), hora_inicio, hora_fin, servicios, observaciones || null, tipo_servicio || 'revision');

    const json = result[0]?.result;
    if (!json?.success) {
      return res.status(400).json({ success: false, error: json?.error || 'Error al agendar cita' });
    }

    return res.status(201).json(json);
  } catch (error) {
    console.error('Error crearAppointment:', error);
    return res.status(500).json({ success: false, error: 'Error al crear cita' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/appointments/:id/status — Cambiar estado (usa cita_cambiar_estado)
// ─────────────────────────────────────────────
export const cambiarEstadoAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;

    if (!estado) {
      return res.status(400).json({ success: false, error: 'El campo estado es requerido' });
    }

    const estadosValidos = ['Agendado', 'En_taller', 'En_progreso', 'En_revision', 'Completado', 'Entregado', 'Cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
    }

    const result = await prisma.$queryRawUnsafe(`
      SELECT cita_cambiar_estado($1::uuid, $2::text, $3::uuid, $4::text) AS result
    `, id, estado, req.user.id, observaciones || null);

    const json = result[0]?.result;
    if (!json?.success) {
      return res.status(400).json({ success: false, error: json?.error || 'Error al cambiar estado' });
    }

    return res.json(json);
  } catch (error) {
    console.error('Error cambiarEstadoAppointment:', error);
    return res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

// ─────────────────────────────────────────────
// GET /api/appointments/available-slots — Horarios disponibles (usa horarios_disponibles)
// ─────────────────────────────────────────────
export const availableSlots = async (req, res) => {
  try {
    let { empleado_id, fecha, tipo_servicio } = req.query;

    if (!fecha) {
      fecha = new Date().toISOString().split('T')[0];
    }

    if (!empleado_id) {
      const emp = await prisma.empleado.findFirst({
        where: { estado: true },
        select: { id: true }
      });
      if (emp) empleado_id = emp.id;
    }

    if (!empleado_id) {
      return res.status(404).json({ success: false, error: 'No hay empleados registrados para consultar horarios' });
    }

    const result = await prisma.$queryRawUnsafe(`
      SELECT hora_inicio, hora_fin, disponible
      FROM horarios_disponibles($1::uuid, $2::date, $3::text)
      ORDER BY hora_inicio
    `, empleado_id, new Date(fecha), tipo_servicio || 'revision');

    return res.json({
      success: true,
      data: result,
      empleado_id,
      fecha,
    });
  } catch (error) {
    console.error('Error availableSlots:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener horarios disponibles' });
  }
};
