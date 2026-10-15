import nodemailer from 'nodemailer';
import prisma from '../config/database.js';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

const EMAIL_FROM = `"ADN Motors" <${config.email.user}>`;

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
    console.log(`📧 Email enviado a ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Error enviando email a ${to}:`, err.message);
  }
};

// ─────────────────────────────────────────────
// Handlers para cada evento
// ─────────────────────────────────────────────

export const handleCitaCreada = async (payload) => {
  try {
    const { cita_id, cliente_id, fecha, hora_inicio } = typeof payload === 'string' ? JSON.parse(payload) : payload;

    const cita = await prisma.cita.findUnique({
      where: { id: cita_id },
      include: {
        cliente: { include: { usuario: true } },
        empleado: { include: { usuario: true } },
        detalleServicios: { include: { servicio: true } },
      },
    });
    if (!cita) return;

    const servicios = cita.detalleServicios.map(ds => ds.servicio.descripcion).join(', ');
    const fechaFormateada = new Date(fecha || cita.fechaCita).toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    await sendMail(
      cita.cliente.usuario.email,
      'Cita confirmada — ADN Motors',
      `
      <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
        <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:25px;border-radius:16px;text-align:center">
          <h1 style="color:white;margin:0">Cita Confirmada</h1>
        </div>
        <div style="padding:25px">
          <p>Hola <strong>${cita.cliente.usuario.nombreCompleto}</strong>,</p>
          <p>Tu cita en ADN Motors ha sido agendada exitosamente:</p>
          <table style="width:100%;background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0">
            <tr><td style="padding:4px"><strong>Fecha:</strong></td><td>${fechaFormateada}</td></tr>
            <tr><td style="padding:4px"><strong>Hora:</strong></td><td>${hora_inicio || cita.horaInicio?.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td></tr>
            <tr><td style="padding:4px"><strong>Mecánico:</strong></td><td>${cita.empleado.usuario.nombreCompleto}</td></tr>
            <tr><td style="padding:4px"><strong>Servicios:</strong></td><td>${servicios}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px">Si necesitas cancelar o reprogramar, contáctanos al teléfono del taller.</p>
        </div>
      </div>
      `
    );
  } catch (err) {
    console.error('Error handleCitaCreada:', err);
  }
};

export const handlePresupuestoGenerado = async (payload) => {
  try {
    const { cita_id, token, email } = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const link = `${config.frontend.url}/presupuesto/${token}`;

    await sendMail(
      email,
      'Tu presupuesto está listo — ADN Motors',
      `
      <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
        <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:25px;border-radius:16px;text-align:center">
          <h1 style="color:white;margin:0">Presupuesto Generado</h1>
        </div>
        <div style="padding:25px;text-align:center">
          <p>Hemos generado un presupuesto para tu vehículo.</p>
          <a href="${link}" style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:bold;margin:20px 0">
            Ver Presupuesto
          </a>
          <p style="color:#6b7280;font-size:13px">Este enlace expirará en 7 días.</p>
        </div>
      </div>
      `
    );
  } catch (err) {
    console.error('Error handlePresupuestoGenerado:', err);
  }
};

export const handleAlertaStock = async (payload) => {
  try {
    const { inventario_id, stock_actual, stock_minimo } = typeof payload === 'string' ? JSON.parse(payload) : payload;

    const item = await prisma.inventario.findUnique({
      where: { id: inventario_id },
      include: { proveedor: true },
    });
    if (!item) return;

    const admins = await prisma.usuario.findMany({
      where: { rol: { descripcion: 'Administrador' }, estado: true },
    });

    for (const admin of admins) {
      await sendMail(
        admin.email,
        `⚠️ Alerta de stock: ${item.nombre}`,
        `
        <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:25px;border-radius:16px;text-align:center">
            <h1 style="color:white;margin:0">⚠️ Alerta de Stock Bajo</h1>
          </div>
          <div style="padding:25px">
            <table style="width:100%;background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0">
              <tr><td><strong>Repuesto:</strong></td><td>${item.nombre} (${item.codigo})</td></tr>
              <tr><td><strong>Categoría:</strong></td><td>${item.categoria}</td></tr>
              <tr><td><strong>Stock actual:</strong></td><td style="color:#dc2626;font-weight:bold">${stock_actual}</td></tr>
              <tr><td><strong>Stock mínimo:</strong></td><td>${stock_minimo}</td></tr>
              ${item.proveedor ? `<tr><td><strong>Proveedor:</strong></td><td>${item.proveedor.nombre} — ${item.proveedor.telefono || ''}</td></tr>` : ''}
            </table>
          </div>
        </div>
        `
      );
    }
  } catch (err) {
    console.error('Error handleAlertaStock:', err);
  }
};

export const handlePreReservaCreada = async (payload) => {
  try {
    const { email, nombre, token } = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const link = `${config.frontend.url}/pre-reserva/confirmar?token=${token}`;

    await sendMail(
      email,
      'Confirma tu pre-reserva — ADN Motors',
      `
      <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
        <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:25px;border-radius:16px;text-align:center">
          <h1 style="color:white;margin:0">Confirma tu Pre-Reserva</h1>
        </div>
        <div style="padding:25px;text-align:center">
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Hemos recibido tu solicitud de pre-reserva. Confírmala con el siguiente botón:</p>
          <a href="${link}" style="display:inline-block;background:#3b82f6;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:bold;margin:20px 0">
            Confirmar Pre-Reserva
          </a>
          <p style="color:#6b7280;font-size:13px">Este enlace expirará en 24 horas.</p>
        </div>
      </div>
      `
    );
  } catch (err) {
    console.error('Error handlePreReservaCreada:', err);
  }
};
