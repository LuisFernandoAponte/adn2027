import prisma from '../config/database.js';

export const listar = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { estado: true },
      include: {
        _count: { select: { inventarios: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return res.json({ success: true, proveedores });
  } catch (error) {
    console.error('Error listar proveedores:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener proveedores' });
  }
};

export const obtener = async (req, res) => {
  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: req.params.id },
      include: {
        inventarios: {
          where: { estado: true },
          orderBy: { nombre: 'asc' },
        },
      },
    });

    if (!proveedor) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }

    return res.json({ success: true, proveedor });
  } catch (error) {
    console.error('Error obtener proveedor:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener proveedor' });
  }
};

export const crear = async (req, res) => {
  try {
    const { nombre, contacto, telefono, email, direccion, tiempo_entrega_dias } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Nombre es requerido' });
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre,
        contacto: contacto || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        tiempoEntregaDias: tiempo_entrega_dias ? parseInt(tiempo_entrega_dias) : 7,
      },
    });

    return res.status(201).json({ success: true, message: 'Proveedor creado', proveedor });
  } catch (error) {
    console.error('Error crear proveedor:', error);
    return res.status(500).json({ success: false, error: 'Error al crear proveedor' });
  }
};

export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion, tiempo_entrega_dias, estado } = req.body;

    const existente = await prisma.proveedor.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (contacto !== undefined) data.contacto = contacto;
    if (telefono !== undefined) data.telefono = telefono;
    if (email !== undefined) data.email = email;
    if (direccion !== undefined) data.direccion = direccion;
    if (tiempo_entrega_dias !== undefined) data.tiempoEntregaDias = parseInt(tiempo_entrega_dias);
    if (estado !== undefined) data.estado = estado;

    const actualizado = await prisma.proveedor.update({ where: { id }, data });

    return res.json({ success: true, message: 'Proveedor actualizado', proveedor: actualizado });
  } catch (error) {
    console.error('Error actualizar proveedor:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar proveedor' });
  }
};

export const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const existente = await prisma.proveedor.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    await prisma.proveedor.update({ where: { id }, data: { estado: false } });
    return res.json({ success: true, message: 'Proveedor desactivado' });
  } catch (error) {
    console.error('Error eliminar proveedor:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar proveedor' });
  }
};
