import prisma from '../config/database.js';

export const getAll = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      include: {
        permisos: {
          include: { permiso: true }
        },
        usuarios: {
          select: {
            id: true,
            nombreCompleto: true,
            email: true,
            telefono: true,
            estado: true,
            fechaReg: true
          }
        },
        _count: {
          select: { usuarios: true, permisos: true }
        }
      },
      orderBy: { fechaReg: 'asc' }
    });

    const ROLES_SISTEMA = ['Administrador', 'Empleado', 'Cliente', 'Admin'];

    const resultado = roles.map(r => ({
      id: r.id,
      descripcion: r.descripcion,
      estado: r.estado,
      esSistema: ROLES_SISTEMA.some(sys => sys.toLowerCase() === r.descripcion.trim().toLowerCase()),
      permisosCount: r.permisos.length,
      usuariosCount: r._count.usuarios,
      usuarios: r.usuarios || [],
      permisos: r.permisos.map(p => ({
        id: p.permiso.id,
        permiso: p.permiso.permiso
      }))
    }));

    return res.json(resultado);

  } catch (error) {
    console.error('Error getAll roles:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const rol = await prisma.rol.findUnique({
      where: { id },
      include: {
        permisos: {
          include: { permiso: true }
        },
        usuarios: {
          select: {
            id: true,
            nombreCompleto: true,
            email: true,
            telefono: true,
            estado: true,
            fechaReg: true
          }
        },
        _count: {
          select: { usuarios: true, permisos: true }
        }
      }
    });

    if (!rol) {
      return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    }

    const ROLES_SISTEMA = ['Administrador', 'Empleado', 'Cliente', 'Admin'];

    return res.json({
      id: rol.id,
      descripcion: rol.descripcion,
      estado: rol.estado,
      esSistema: ROLES_SISTEMA.some(sys => sys.toLowerCase() === rol.descripcion.trim().toLowerCase()),
      permisosCount: rol.permisos.length,
      usuariosCount: rol._count.usuarios,
      usuarios: rol.usuarios || [],
      permisos: rol.permisos.map(p => ({
        id: p.permiso.id,
        permiso: p.permiso.permiso
      }))
    });

  } catch (error) {
    console.error('Error getById rol:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener rol' });
  }
};

export const getUsuariosDeRol = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await prisma.rol.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: {
            id: true,
            nombreCompleto: true,
            email: true,
            telefono: true,
            estado: true,
            fechaReg: true
          }
        }
      }
    });

    if (!rol) {
      return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    }

    return res.json({
      success: true,
      rolId: rol.id,
      nombreRol: rol.descripcion,
      usuarios: rol.usuarios || []
    });
  } catch (error) {
    console.error('Error getUsuariosDeRol:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener usuarios del rol' });
  }
};

export const create = async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del rol es obligatorio' });
    }

    const nombreLimpio = descripcion.trim();

    // Verificación case-insensitive
    const rolesExistentes = await prisma.rol.findMany();
    const existe = rolesExistentes.some(r => r.descripcion.trim().toLowerCase() === nombreLimpio.toLowerCase());

    if (existe) {
      return res.status(400).json({ success: false, error: `Ya existe un rol registrado con el nombre "${nombreLimpio}"` });
    }

    const rol = await prisma.rol.create({
      data: { descripcion: nombreLimpio }
    });

    return res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      rol: { id: rol.id, descripcion: rol.descripcion, esSistema: false, usuariosCount: 0, permisosCount: 0, permisos: [], usuarios: [] }
    });

  } catch (error) {
    console.error('Error create rol:', error);
    return res.status(500).json({ success: false, error: 'Error al crear el rol' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del rol no puede estar vacío' });
    }

    const rolActual = await prisma.rol.findUnique({ where: { id } });
    if (!rolActual) {
      return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    }

    const ROLES_SISTEMA = ['Administrador', 'Empleado', 'Cliente', 'Admin'];
    if (ROLES_SISTEMA.some(sys => sys.toLowerCase() === rolActual.descripcion.trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: `El nombre del rol del sistema "${rolActual.descripcion}" está protegido y no se puede modificar.` });
    }

    const nombreLimpio = descripcion.trim();

    const rol = await prisma.rol.update({
      where: { id },
      data: { descripcion: nombreLimpio }
    });

    return res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      rol: { id: rol.id, descripcion: rol.descripcion }
    });

  } catch (error) {
    console.error('Error update rol:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar el rol' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const rol = await prisma.rol.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true } }
      }
    });

    if (!rol) {
      return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    }

    const ROLES_SISTEMA = ['Administrador', 'Empleado', 'Cliente', 'Admin'];
    if (ROLES_SISTEMA.some(sys => sys.toLowerCase() === rol.descripcion.trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: `No se puede eliminar el rol protegido del sistema "${rol.descripcion}".` });
    }

    if (rol._count.usuarios > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar el rol "${rol.descripcion}" porque tiene ${rol._count.usuarios} usuario(s) asignado(s). Reasigna o elimina los usuarios antes de eliminar el rol.`
      });
    }

    await prisma.rol.delete({ where: { id } }).catch(async () => {
      await prisma.rol.update({
        where: { id },
        data: { estado: false }
      });
    });

    return res.json({ success: true, message: `Rol "${rol.descripcion}" eliminado exitosamente.` });

  } catch (error) {
    console.error('Error remove rol:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar el rol' });
  }
};

export const asignarPermisos = async (req, res) => {
  try {
    const { id } = req.params;
    const { permisoIds } = req.body;

    await prisma.detallePermiso.deleteMany({ where: { rolId: id } });

    if (permisoIds && Array.isArray(permisoIds) && permisoIds.length > 0) {
      // Filtrar IDs nulos o vacíos y evitar duplicados
      const idsUnicos = Array.from(new Set(permisoIds.filter(Boolean)));
      await prisma.detallePermiso.createMany({
        data: idsUnicos.map(pid => ({
          rolId: id,
          permisoId: pid
        }))
      });
    }

    return res.json({ success: true, message: 'Permisos asignados exitosamente al rol' });

  } catch (error) {
    console.error('Error asignarPermisos:', error);
    return res.status(500).json({ success: false, error: 'Error al asignar permisos' });
  }
};