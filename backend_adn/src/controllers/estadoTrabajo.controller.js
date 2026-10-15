import prisma from '../config/database.js';

export const actualizarEstado = async (req, res) => {
  try {
    const { citaId } = req.params;
    const { estado, observaciones } = req.body;

    const estadoMap = {
      'En taller': 'En_taller',
      'En progreso': 'En_progreso',
      'En revisión': 'En_revision'
    };

    const estadoPrisma = estadoMap[estado] || estado;

    const citaActual = await prisma.cita.findUnique({ where: { id: citaId } });

    if (!citaActual) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    const cita = await prisma.cita.update({
      where: { id: citaId },
      data: { estado: estadoPrisma }
    });

    await prisma.estadoTrabajo.create({
      data: {
        estado,
        estadoAnterior: citaActual.estado === 'En_taller' ? 'En taller' : citaActual.estado === 'En_progreso' ? 'En progreso' : citaActual.estado === 'En_revision' ? 'En revisión' : citaActual.estado,
        observaciones,
        citaId,
        usuarioId: req.user.id
      }
    });

    return res.json({ success: true, message: `Estado actualizado a ${estado}` });

  } catch (error) {
    console.error('Error actualizarEstado:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar estado' });
  }
};

export const verHistorial = async (req, res) => {
  try {
    const { citaId } = req.params;

    const historial = await prisma.estadoTrabajo.findMany({
      where: { citaId },
      include: {
        usuario: { select: { nombreCompleto: true } }
      },
      orderBy: { fechaCambio: 'desc' }
    });

    return res.json({
      success: true,
      historial: historial.map(h => ({
        id: h.id,
        estado: h.estado,
        estado_anterior: h.estadoAnterior,
        fecha_cambio: h.fechaCambio,
        observaciones: h.observaciones,
        usuario: h.usuario.nombreCompleto
      }))
    });

  } catch (error) {
    console.error('Error verHistorial:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
};