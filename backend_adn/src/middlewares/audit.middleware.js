import prisma from '../config/database.js';

export const auditLog = (accion, entidad) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entidadId = req.params?.id || req.body?.id || body?.id || null;

        await prisma.auditoria.create({
          data: {
            usuarioId: req.user?.id || null,
            accion,
            entidad,
            entidadId: entidadId ? String(entidadId) : null,
            detalle: JSON.stringify({ method: req.method, path: req.originalUrl }),
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
          },
        }).catch(err => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };

    next();
  };
};

export const auditLogin = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (body) {
    await prisma.auditoria.create({
      data: {
        usuarioId: body?.user?.id || null,
        accion: body?.success ? 'login_exitoso' : 'login_fallido',
        entidad: 'Auth',
        detalle: JSON.stringify({ email: req.body?.email, success: body?.success }),
        ip: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(err => console.error('Audit log error:', err));

    return originalJson(body);
  };

  next();
};
