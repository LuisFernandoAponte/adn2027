import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../services/db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signToken(userId, email, rolId) {
  return jwt.sign({ userId, email, rolId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
}

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y password son requeridos' });
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.password, u."nombreCompleto", u.estado,
              u."emailVerificado", u."intentosFallidos", u."bloqueadoHasta",
              u."rolId", r.descripcion as rol_nombre
       FROM usuario u JOIN rol r ON u."rolId" = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    if (!user.estado) {
      return res.status(403).json({ success: false, error: 'Usuario desactivado' });
    }

    // Verificar bloqueo
    if (user.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date()) {
      const mins = Math.ceil((new Date(user.bloqueadoHasta) - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Cuenta bloqueada. Intenta en ${mins} minuto(s).`
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const nuevosIntentos = (user.intentosFallidos || 0) + 1;
      await query('UPDATE usuario SET "intentosFallidos" = $1 WHERE id = $2', [nuevosIntentos, user.id]);

      if (nuevosIntentos >= 3) {
        await query(
          'UPDATE usuario SET "bloqueadoHasta" = NOW() + INTERVAL \'5 minutes\', "intentosFallidos" = 0 WHERE id = $1',
          [user.id]
        );
        return res.status(429).json({ success: false, error: 'Cuenta bloqueada por 5 minutos por múltiples intentos fallidos.' });
      }

      return res.status(401).json({
        success: false,
        error: `Credenciales inválidas. Te quedan ${3 - nuevosIntentos} intento(s).`
      });
    }

    // Login exitoso - resetear intentos
    await query(
      'UPDATE usuario SET "intentosFallidos" = 0, "bloqueadoHasta" = NULL WHERE id = $1',
      [user.id]
    );

    // Obtener permisos
    const { rows: permisos } = await query(
      `SELECT DISTINCT p.permiso FROM detalle_permiso dp
       JOIN permisos p ON dp."permisoId" = p.id
       WHERE dp."rolId" = $1`,
      [user.rolId]
    );

    const token = signToken(user.id, user.email, user.rolId);
    const refreshToken = signRefreshToken(user.id);

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombreCompleto,
        email: user.email,
        rol_id: user.rolId,
        rol_nombre: user.rol_nombre,
        email_verificado: user.emailVerificado,
        permisos: permisos.map(p => p.permiso)
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { nombreCompleto, email, telefono, password, direccion, sexo, edad } = req.body;

    if (!nombreCompleto || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nombre, email y password son requeridos' });
    }

    const { rows: existing } = await query('SELECT id FROM usuario WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows: [newUser] } = await query(
      `INSERT INTO usuario ("nombreCompleto", email, telefono, password, direccion, sexo, edad, "rolId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT id FROM rol WHERE descripcion = 'Cliente'))
       RETURNING id`,
      [nombreCompleto, email, telefono || null, hashedPassword, direccion || null, sexo || null, edad || null]
    );

    await query('INSERT INTO cliente ("usuarioId") VALUES ($1)', [newUser.id]);

    const token = signToken(newUser.id, email, null);

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser.id, nombre: nombreCompleto, email }
    });
  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token requerido' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    const { rows } = await query('SELECT id, email, "rolId" FROM usuario WHERE id = $1 AND estado = true', [decoded.userId]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const newToken = signToken(user.id, user.email, user.rolId);
    const newRefreshToken = signRefreshToken(user.id);

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Refresh token inválido o expirado' });
    }
    console.error('Error en refresh:', err);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

export default router;
