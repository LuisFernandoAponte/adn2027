import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import rateLimit from 'express-rate-limit';

// ==========================================
// CACHÉ EN MEMORIA PARA AUTENTICACIÓN
// Evita consultar Supabase en cada petición HTTP
// ==========================================
const userCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000; // 60 segundos de TTL

const rolPermisosCache = new Map();
const PERMISOS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de TTL

export const invalidateUserAuthCache = (userId) => {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
};

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
    const now = Date.now();

    // 1. Revisar caché en memoria primero (0ms)
    let usuario = null;
    const cached = userCache.get(decoded.userId);
    if (cached && cached.expiresAt > now) {
      usuario = cached.data;
    } else {
      // 2. Consulta proyectada ultra-rápida si expiró o no está en caché
      usuario = await prisma.usuario.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          rolId: true,
          estado: true,
          emailVerificado: true,
          rol: {
            select: { descripcion: true }
          }
        }
      });

      if (usuario && usuario.estado) {
        userCache.set(decoded.userId, {
          data: usuario,
          expiresAt: now + USER_CACHE_TTL_MS
        });
      }
    }

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

      // El rol Administrador posee acceso irrestricto a todas las funciones
      const userRol = (req.user.rol || '').toLowerCase();
      if (userRol === 'administrador' || userRol === 'admin') {
        return next();
      }

      const now = Date.now();
      let tienePermiso = false;
      const cached = rolPermisosCache.get(req.user.rolId);

      if (cached && cached.expiresAt > now) {
        tienePermiso = cached.permisos.some(p => p.toLowerCase() === permisoRequerido.toLowerCase());
      } else {
        const permisos = await prisma.detallePermiso.findMany({
          where: { rolId: req.user.rolId },
          select: {
            permiso: {
              select: { permiso: true }
            }
          }
        });

        const list = permisos.map(p => p.permiso.permiso);
        rolPermisosCache.set(req.user.rolId, {
          permisos: list,
          expiresAt: now + PERMISOS_CACHE_TTL_MS
        });

        tienePermiso = list.some(p => p.toLowerCase() === permisoRequerido.toLowerCase());
      }

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
  max: Math.max(config.rateLimit.max || 100, 2000), // Evita bloquear la red compartida del taller
  message: { success: false, error: 'Demasiadas solicitudes, intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Si viene autenticado, limita por sesión de usuario para no penalizar a otros mecánicos en el mismo Wi-Fi
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return `jwt_${auth.slice(-24)}`;
    }
    return req.ip || req.headers['x-forwarded-for'] || 'taller-ip';
  }
});
