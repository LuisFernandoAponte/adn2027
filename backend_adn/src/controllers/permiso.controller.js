import prisma from '../config/database.js';

const PERMISOS_DEFAULT = [
  "ver_trabajos", "crear_trabajos", "editar_trabajos", "cambiar_estado_trabajos", "eliminar_trabajos",
  "ver_citas", "agendar_citas", "editar_citas", "cancelar_citas",
  "ver_clientes", "crear_clientes", "editar_clientes", "eliminar_clientes",
  "ver_vehiculos", "registrar_vehiculos", "editar_vehiculos", "eliminar_vehiculos",
  "ver_inventario", "crear_repuestos", "editar_repuestos", "ajustar_stock", "eliminar_repuestos",
  "ver_facturas", "generar_facturas", "registrar_pagos", "anular_facturas",
  "ver_usuarios", "crear_usuarios", "editar_usuarios", "desactivar_usuarios",
  "ver_reportes", "exportar_reportes",
  "gestionar_roles", "gestionar_permisos"
];

export const getAll = async (req, res) => {
  try {
    let permisos = await prisma.permiso.findMany({
      where: { estado: true },
      orderBy: { permiso: 'asc' }
    });

    // Si la lista tiene menos permisos que el catálogo base, asegurar que existan
    if (permisos.length < PERMISOS_DEFAULT.length) {
      const existentesMap = new Set(permisos.map(p => p.permiso.toLowerCase().trim()));
      const faltantes = PERMISOS_DEFAULT.filter(p => !existentesMap.has(p.toLowerCase()));

      if (faltantes.length > 0) {
        await prisma.permiso.createMany({
          data: faltantes.map(p => ({ permiso: p })),
          skipDuplicates: true
        });
        permisos = await prisma.permiso.findMany({
          where: { estado: true },
          orderBy: { permiso: 'asc' }
        });
      }
    }

    return res.json(permisos.map(p => ({
      id: p.id,
      permiso: p.permiso
    })));

  } catch (error) {
    console.error('Error getAll permisos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener permisos' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const permiso = await prisma.permiso.findUnique({ where: { id } });

    if (!permiso) {
      return res.status(404).json({ success: false, error: 'Permiso no encontrado' });
    }

    return res.json({ id: permiso.id, permiso: permiso.permiso });

  } catch (error) {
    console.error('Error getById permiso:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener permiso' });
  }
};

export const create = async (req, res) => {
  try {
    const { permiso } = req.body;

    if (!permiso) {
      return res.status(400).json({ success: false, error: 'Permiso es requerido' });
    }

    const existe = await prisma.permiso.findUnique({ where: { permiso } });
    if (existe) {
      return res.status(400).json({ success: false, error: 'Este permiso ya existe' });
    }

    const nuevo = await prisma.permiso.create({
      data: { permiso }
    });

    return res.status(201).json({
      success: true,
      message: 'Permiso creado exitosamente',
      permiso: { id: nuevo.id, permiso: nuevo.permiso }
    });

  } catch (error) {
    console.error('Error create permiso:', error);
    return res.status(500).json({ success: false, error: 'Error al crear permiso' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { permiso } = req.body;

    const actualizado = await prisma.permiso.update({
      where: { id },
      data: { permiso }
    });

    return res.json({
      success: true,
      message: 'Permiso actualizado exitosamente',
      permiso: { id: actualizado.id, permiso: actualizado.permiso }
    });

  } catch (error) {
    console.error('Error update permiso:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar permiso' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.permiso.update({
      where: { id },
      data: { estado: false }
    });

    return res.json({ success: true, message: 'Permiso desactivado exitosamente' });

  } catch (error) {
    console.error('Error remove permiso:', error);
    return res.status(500).json({ success: false, error: 'Error al desactivar permiso' });
  }
};

export const getMisPermisos = async (req, res) => {
  try {
    const permisos = await prisma.detallePermiso.findMany({
      where: { rol: { usuarios: { some: { id: req.user.id } } } },
      include: { permiso: true }
    });

    return res.json(permisos.map(p => ({
      id: p.permiso.id,
      permiso: p.permiso.permiso
    })));

  } catch (error) {
    console.error('Error getMisPermisos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener permisos' });
  }
};