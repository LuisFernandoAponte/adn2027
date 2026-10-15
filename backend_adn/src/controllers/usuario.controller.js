import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../config/database.js';

const rolIdSchema = z.union([z.string().min(1), z.number().positive()]).transform(val => String(val));

const normalizeSexo = (sexo) => {
  if (!sexo) return null;
  const lower = sexo.toLowerCase();
  if (lower === 'masculino') return 'Masculino';
  if (lower === 'femenino') return 'Femenino';
  if (lower === 'otro') return 'Otro';
  return sexo;
};

const createUsuarioSchema = z.object({
  nombre_completo: z.string().min(1, 'Nombre requerido').max(150),
  email: z.string().email('Email inválido').max(150),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100),
  telefono: z.string().max(20).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  sexo: z.string().optional().nullable(),
  edad: z.number().int().min(0).max(120).optional().nullable(),
  rol_id: rolIdSchema,
  cargo: z.string().max(100).optional().nullable(),
});

const updateUsuarioSchema = z.object({
  nombre_completo: z.string().min(1).max(150).optional(),
  email: z.string().email('Email inválido').max(150).optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100).optional(),
  telefono: z.string().max(20).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  sexo: z.string().optional().nullable(),
  edad: z.number().int().min(0).max(120).optional().nullable(),
  rol_id: rolIdSchema.optional(),
  estado: z.union([z.boolean(), z.number().min(0).max(1)]).optional(),
  cargo: z.string().max(100).optional().nullable(),
});

export const getAll = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        rol: true,
        empleado: { select: { cargo: true } }
      },
      orderBy: { fechaReg: 'desc' }
    });

    const resultado = usuarios.map(u => ({
      id: u.id,
      nombre_completo: u.nombreCompleto,
      email: u.email,
      telefono: u.telefono,
      direccion: u.direccion,
      sexo: u.sexo,
      edad: u.edad,
      estado: u.estado === true || u.estado === 1 ? 1 : 0,
      fecha_reg: u.fechaReg,
      rol_id: u.rolId,
      rol: u.rol.descripcion,
      cargo: u.empleado?.cargo || null
    }));

    return res.json(resultado);

  } catch (error) {
    console.error('Error getAll usuarios:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true }
    });

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    return res.json({
      id: usuario.id,
      nombre_completo: usuario.nombreCompleto,
      email: usuario.email,
      telefono: usuario.telefono,
      direccion: usuario.direccion,
      sexo: usuario.sexo,
      edad: usuario.edad,
      estado: usuario.estado,
      rol_id: usuario.rolId,
      rol: usuario.rol.descripcion
    });

  } catch (error) {
    console.error('Error getById usuario:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener usuario' });
  }
};

export const create = async (req, res) => {
  try {
    const parsed = createUsuarioSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ success: false, error: errors });
    }

    const { nombre_completo, email, password, telefono, direccion, sexo, edad, rol_id, cargo } = parsed.data;

    const existeEmail = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existeEmail) {
      return res.status(400).json({ success: false, error: 'Este email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombreCompleto,
        email: email.toLowerCase(),
        password: passwordHash,
        telefono: telefono || null,
        direccion: direccion || null,
        sexo: normalizeSexo(sexo),
        edad: edad || null,
        rolId: rol_id
      },
      include: { rol: true }
    });

    if (usuario.rol?.descripcion === 'Cliente') {
      await prisma.cliente.upsert({
        where: { usuarioId: usuario.id },
        create: { usuarioId: usuario.id },
        update: {}
      });
    } else if (usuario.rol?.descripcion === 'Empleado' || usuario.rol?.descripcion === 'Administrador') {
      await prisma.empleado.upsert({
        where: { usuarioId: usuario.id },
        create: { usuarioId: usuario.id, cargo: cargo || 'Mecánico de Taller' },
        update: { cargo: cargo || undefined }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado y vinculado a la base de datos con éxito',
      user: {
        id: usuario.id,
        nombre_completo: usuario.nombreCompleto,
        email: usuario.email,
        rol: usuario.rol.descripcion
      }
    });

  } catch (error) {
    console.error('Error create usuario:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Este email ya está registrado' });
    }
    return res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const parsed = updateUsuarioSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ success: false, error: errors });
    }

    const { nombre_completo, email, password, telefono, direccion, sexo, edad, rol_id, estado, cargo } = parsed.data;

    const data = {};

    if (nombre_completo !== undefined) data.nombreCompleto = nombre_completo;
    if (email !== undefined) data.email = email.toLowerCase();
    if (telefono !== undefined) data.telefono = telefono;
    if (direccion !== undefined) data.direccion = direccion;
    if (sexo !== undefined) data.sexo = normalizeSexo(sexo);
    if (edad !== undefined) data.edad = edad;
    if (rol_id !== undefined) data.rolId = rol_id;
    if (estado !== undefined) data.estado = estado === true || estado === 1;
    if (password !== undefined) data.password = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      include: { rol: true }
    });

    if (usuario.rol?.descripcion === 'Cliente') {
      await prisma.cliente.upsert({
        where: { usuarioId: id },
        create: { usuarioId: id },
        update: {}
      });
    } else if (usuario.rol?.descripcion === 'Empleado' || usuario.rol?.descripcion === 'Administrador') {
      await prisma.empleado.upsert({
        where: { usuarioId: id },
        create: { usuarioId: id, cargo: cargo || 'Mecánico de Taller' },
        update: { cargo: cargo || undefined }
      });
    }

    return res.json({
      success: true,
      message: 'Usuario y perfiles asociados actualizados exitosamente',
      user: {
        id: usuario.id,
        nombre_completo: usuario.nombreCompleto,
        email: usuario.email,
        rol: usuario.rol.descripcion
      }
    });

  } catch (error) {
    console.error('Error update usuario:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Este email ya está registrado' });
    }
    return res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.usuario.update({
      where: { id },
      data: { estado: false }
    });

    return res.json({ success: true, message: 'Usuario desactivado exitosamente' });

  } catch (error) {
    console.error('Error remove usuario:', error);
    return res.status(500).json({ success: false, error: 'Error al desactivar usuario' });
  }
};

export const activar = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.usuario.update({
      where: { id },
      data: { estado: true }
    });

    return res.json({ success: true, message: 'Usuario activado exitosamente' });

  } catch (error) {
    console.error('Error activar usuario:', error);
    return res.status(500).json({ success: false, error: 'Error al activar usuario' });
  }
};