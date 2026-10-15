import prisma from '../config/database.js';

export const getAll = async (req, res) => {
  try {
    const servicios = await prisma.servicio.findMany({
      where: { estado: true },
      orderBy: { categoria: 'asc' }
    });

    const resultado = servicios.map(s => ({
      id: s.id,
      categoria: s.categoria,
      descripcion: s.descripcion,
      costo: s.costo,
      duracion_estimada: s.duracionEstimada,
      estado: s.estado ? 1 : 0
    }));

    return res.json({ success: true, servicios: resultado });

  } catch (error) {
    console.error('Error getAll servicios:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener servicios' });
  }
};