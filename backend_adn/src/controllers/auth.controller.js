import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import nodemailer from 'nodemailer';
import emailService from '../services/emailService.js';
import { sendSystemEmail } from '../utils/mailer.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || config.email.user,
    pass: process.env.EMAIL_APP_PASSWORD || config.email.password
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const mapRol = (rol) => {
  const map = {
    'Administrador': 'admin',
    'Empleado': 'empleado',
    'Cliente': 'cliente',
    'Secretaria': 'secretaria'
  };
  return map[rol] || rol?.toLowerCase();
};

const getPermisosByUsuarioId = async (usuarioId) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      rol: {
        include: {
          permisos: {
            include: { permiso: true }
          }
        }
      }
    }
  });
  
  if (!usuario) return [];
  return usuario.rol.permisos.map(dp => dp.permiso.permiso);
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { rol: true }
    });

    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    if (!usuario.estado) {
      return res.status(403).json({ success: false, error: 'Tu cuenta está desactivada' });
    }

    if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
      return res.status(403).json({ 
        success: false, 
        error: `Cuenta bloqueada hasta ${new Date(usuario.bloqueadoHasta).toLocaleString()}` 
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: { increment: 1 }
        }
      });

      if (usuario.intentosFallidos >= 4) {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            bloqueadoHasta: new Date(Date.now() + 30 * 60 * 1000)
          }
        });
      }

      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null }
    });

    const permisos = await getPermisosByUsuarioId(usuario.id);

    const token = jwt.sign(
      { userId: usuario.id, rolId: usuario.rolId, rol: mapRol(usuario.rol.descripcion) },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      token,
      user: {
        id: usuario.id,
        nombre_completo: usuario.nombreCompleto,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        sexo: usuario.sexo,
        edad: usuario.edad,
        rol: mapRol(usuario.rol.descripcion),
        rol_id: usuario.rolId,
        estado: usuario.estado,
        email_verificado: usuario.emailVerificado,
        permisos
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmailWithCode = async (email, nombre, code) => {
  const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">ADN Motors</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; font-size: 24px; margin-top: 0;">¡Bienvenido${nombre ? ', ' + nombre.split(' ')[0] : ''}!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Gracias por registrarte en ADN Motors. Para completar tu registro, usa el siguiente código de verificación:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #f3f4f6; padding: 20px 40px; border-radius: 12px; display: inline-block; letter-spacing: 12px; font-size: 36px; font-weight: bold; color: #dc2626;">
              ${code}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            ⏱️ Este código expirará en <strong>10 minutos</strong>. Si no solicitaste este registro, ignora este mensaje.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          ADN Motors — Taller Automotriz Profesional
        </p>
      </div>
  `;

  return await sendSystemEmail({
    to: email,
    subject: 'Tu código de verificación - ADN Motors',
    html: mailHtml,
    text: `Tu código de verificación ADN Motors es: ${code} (expira en 10 minutos).`
  });
};

export const register = async (req, res) => {
  try {
    const { nombre_completo, email, password, telefono, direccion, sexo, edad } = req.body;

    if (!nombre_completo || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nombre, email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }

    const existeEmail = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existeEmail) {
      return res.status(400).json({ success: false, error: 'Este email ya está registrado' });
    }

    const rolCliente = await prisma.rol.findUnique({
      where: { descripcion: 'Cliente' }
    });

    if (!rolCliente) {
      return res.status(500).json({ success: false, error: 'Rol Cliente no encontrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const codigo = generateVerificationCode();
    const codigoHash = await bcrypt.hash(codigo, 6);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const usuario = await prisma.usuario.create({
      data: {
        nombreCompleto: nombre_completo,
        email: email.toLowerCase(),
        password: passwordHash,
        telefono: telefono || null,
        direccion: direccion || null,
        sexo: sexo || null,
        edad: edad ? parseInt(edad) : null,
        rolId: rolCliente.id,
        emailVerificado: false,
        emailVerificacionToken: codigoHash,
        emailVerificacionExpiracion: expires,
      }
    });

    await prisma.cliente.create({
      data: { usuarioId: usuario.id }
    });

    console.log(`📧 Código de verificación para ${email.toLowerCase()}: ${codigo}`);
    await sendVerificationEmailWithCode(email.toLowerCase(), nombre_completo, codigo);

    const response = {
      success: true,
      message: 'Registro exitoso. Te hemos enviado un código de verificación a tu correo.',
      email: email.toLowerCase(),
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email y código son requeridos' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { rol: true },
    });

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (usuario.emailVerificado) {
      return res.status(400).json({ success: false, error: 'Email ya verificado' });
    }

    if (!usuario.emailVerificacionToken || !usuario.emailVerificacionExpiracion) {
      return res.status(400).json({ success: false, error: 'No hay código de verificación pendiente. Solicita uno nuevo.' });
    }

    if (new Date(usuario.emailVerificacionExpiracion) < new Date()) {
      return res.status(400).json({ success: false, error: 'Código expirado. Solicita uno nuevo.' });
    }

    const codeValido = await bcrypt.compare(code, usuario.emailVerificacionToken);
    if (!codeValido) {
      return res.status(400).json({ success: false, error: 'Código incorrecto' });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificado: true,
        emailVerificacionToken: null,
        emailVerificacionExpiracion: null,
      }
    });

    const token = jwt.sign(
      { userId: usuario.id, rolId: usuario.rolId, rol: mapRol(usuario.rol.descripcion) },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const permisos = await getPermisosByUsuarioId(usuario.id);

    return res.json({
      success: true,
      message: 'Email verificado exitosamente',
      token,
      user: {
        id: usuario.id,
        nombre_completo: usuario.nombreCompleto,
        email: usuario.email,
        rol: mapRol(usuario.rol.descripcion),
        email_verificado: true,
        permisos,
      }
    });

  } catch (error) {
    console.error('Error verifyCode:', error);
    return res.status(500).json({ success: false, error: 'Error al verificar código' });
  }
};

export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email es requerido' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (usuario.emailVerificado) {
      return res.status(400).json({ success: false, error: 'Email ya verificado' });
    }

    const codigo = generateVerificationCode();
    const codigoHash = await bcrypt.hash(codigo, 6);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificacionToken: codigoHash,
        emailVerificacionExpiracion: expires,
      }
    });

    console.log(`📧 Código reenviado para ${email.toLowerCase()}: ${codigo}`);
    await sendVerificationEmailWithCode(email.toLowerCase(), usuario.nombreCompleto, codigo);

    const response = {
      success: true,
      message: 'Código reenviado a tu correo',
    };

    return res.json(response);

  } catch (error) {
    console.error('Error resendVerificationCode:', error);
    return res.status(500).json({ success: false, error: 'Error al reenviar código' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: { rol: true }
    });

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const permisos = await getPermisosByUsuarioId(usuario.id);

    return res.json({
      success: true,
      user: {
        id: usuario.id,
        nombre_completo: usuario.nombreCompleto,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        sexo: usuario.sexo,
        edad: usuario.edad,
        fecha_reg: usuario.fechaReg,
        rol_id: usuario.rolId,
        rol: mapRol(usuario.rol.descripcion),
        estado: usuario.estado,
        email_verificado: usuario.emailVerificado,
        permisos
      }
    });

  } catch (error) {
    console.error('Error en getProfile:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    let targetEmail = email || undefined;

    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Formato de email inválido' });
      }

      const emailExistente = await prisma.usuario.findFirst({
        where: { email: email.toLowerCase(), id: { not: userId } }
      });

      if (emailExistente) {
        return res.status(400).json({ success: false, error: 'Este email ya está registrado en otra cuenta' });
      }

      await prisma.usuario.update({
        where: { id: userId },
        data: { email: email.toLowerCase(), emailVerificado: false }
      });

      targetEmail = email.toLowerCase();
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (usuario.emailVerificado && !email) {
      return res.status(400).json({ success: false, error: 'El email ya está verificado' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        emailVerificacionToken: token,
        emailVerificacionExpiracion: expires
      }
    });

    const verificationLink = `${config.frontend.url}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"ADN Motors" <${config.email.user}>`,
      to: targetEmail || usuario.email,
      subject: 'Verifica tu correo electrónico - ADN Motors',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; font-size: 28px; margin: 0;">ADN Motors</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; font-size: 24px; margin-top: 0;">¡Bienvenido a ADN Motors!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Para completar tu registro y poder usar todas las funciones de tu cuenta, por favor verifica tu correo electrónico haciendo clic en el botón a continuación:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: bold; display: inline-block;">
                Verificar mi email
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 20px;">
              ⏱️ Este enlace expirará en <strong>1 hora</strong> por seguridad.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: 'Correo de verificación enviado. Revisa tu bandeja de entrada y carpeta de spam.',
      email: targetEmail || usuario.email
    });

  } catch (error) {
    console.error('Error al enviar verificación:', error);
    return res.status(500).json({ success: false, error: 'Error al enviar el correo de verificación' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(`${config.frontend.url}/perfil?verified=error&message=Token requerido`);
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        emailVerificacionToken: token
      }
    });

    if (!usuario) {
      return res.redirect(`${config.frontend.url}/perfil?verified=error&message=Token inválido o ya utilizado`);
    }

    if (usuario.emailVerificacionExpiracion < new Date()) {
      return res.redirect(`${config.frontend.url}/perfil?verified=error&message=Token expirado`);
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificado: true,
        emailVerificacionToken: null,
        emailVerificacionExpiracion: null
      }
    });

    return res.redirect(`${config.frontend.url}/perfil?verified=success`);

  } catch (error) {
    console.error('Error al verificar email:', error);
    return res.redirect(`${config.frontend.url}/perfil?verified=error&message=Error al verificar el email`);
  }
};

export const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token no proporcionado' });
    }

    const oldToken = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(oldToken, config.jwt.secret, { ignoreExpiration: true });
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Token inválido' });
      }
      throw err;
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { rol: true }
    });

    if (!usuario || !usuario.estado) {
      return res.status(401).json({ success: false, error: 'Usuario no válido o desactivado' });
    }

    const newToken = jwt.sign(
      { userId: usuario.id, rolId: usuario.rolId, rol: mapRol(usuario.rol.descripcion) },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return res.json({ success: true, token: newToken });

  } catch (error) {
    console.error('Error refreshToken:', error);
    return res.status(500).json({ success: false, error: 'Error al refrescar token' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombreCompleto, nombre_completo, telefono, direccion, sexo, edad } = req.body;

    const targetNombre = nombreCompleto || nombre_completo;

    const dataToUpdate = {};
    if (targetNombre !== undefined) dataToUpdate.nombreCompleto = targetNombre;
    if (telefono !== undefined) dataToUpdate.telefono = telefono;
    if (direccion !== undefined) dataToUpdate.direccion = direccion;
    if (sexo !== undefined) dataToUpdate.sexo = sexo;
    if (edad !== undefined) dataToUpdate.edad = edad !== null && edad !== '' ? parseInt(edad) : null;

    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: dataToUpdate,
      include: { rol: true }
    });

    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: updatedUser.id,
        nombre_completo: updatedUser.nombreCompleto,
        email: updatedUser.email,
        telefono: updatedUser.telefono,
        direccion: updatedUser.direccion,
        sexo: updatedUser.sexo,
        edad: updatedUser.edad,
        rol: mapRol(updatedUser.rol.descripcion),
        email_verificado: updatedUser.emailVerificado,
      }
    });
  } catch (error) {
    console.error('Error updateProfile:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar el perfil' });
  }
};

export const getPublicRoles = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      where: { estado: true },
      select: { id: true, descripcion: true }
    });
    return res.json({ success: true, roles });
  } catch (error) {
    console.error('Error getPublicRoles:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
};