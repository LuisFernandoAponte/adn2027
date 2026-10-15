import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import rateLimit from 'express-rate-limit';

export const verifyToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { rol: true }
    });

    if (!usuario || !usuario.estado) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado o desactivado' });
    }

    req.user = {
      id: usuario.id,
      email: usuario.email,
      rolId: usuario.rolId,
      rol: usuario.rol.descripcion,
      emailVerificado: Boolean(usuario.emailVerificado)
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    return res.status(500).json({ success: false, error: 'Error al verificar token' });
  }
};

export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }

  const rol = (req.user.rol || '').toLowerCase();
  // Personal del taller (admin, empleados, secretaria) pueden gestionar citas sin restricción
  if (['admin', 'administrador', 'empleado', 'secretaria'].includes(rol)) {
    return next();
  }

  if (!req.user.emailVerificado) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Debes verificar tu correo electrónico para agendar citas en el taller.'
    });
  }

  next();
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }

    const userRol = (req.user.rol || '').toLowerCase();
    const allowed = roles.some(r => {
      const rLower = r.toLowerCase();
      return rLower === userRol ||
        (rLower === 'administrador' && userRol === 'admin') ||
        (userRol === 'administrador' && rLower === 'admin');
    });

    if (!allowed) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para esta acción' });
    }

    next();
  };
};

export const requirePermiso = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'No autenticado' });
      }

      const permisos = await prisma.detallePermiso.findMany({
        where: { rolId: req.user.rolId },
        include: { permiso: true }
      });

      const tienePermiso = permisos.some(p => p.permiso.permiso === permisoRequerido);

      if (!tienePermiso) {
        return res.status(403).json({ success: false, error: 'No tienes el permiso necesario' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error al verificar permisos' });
    }
  };
};

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  message: { success: false, error: 'Demasiados intentos. Intenta de nuevo en 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: 'Demasiadas solicitudes, intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
