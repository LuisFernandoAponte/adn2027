import pg from 'pg';
import nodemailer from 'nodemailer';
import { getPool } from './db.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

function formatDateES(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

async function sendAppointmentConfirmation(data) {
  const { rows } = await getPool().query(`
    SELECT u."nombreCompleto" AS cliente_nombre, u.email,
           emp_u."nombreCompleto" AS mecanico_nombre,
           c."fechaCita", c."horaInicio", c."horaFin",
           COALESCE(
             (SELECT STRING_AGG(s.descripcion, ', ') FROM detalle_servicio ds JOIN servicios s ON ds."servicioId" = s.id WHERE ds."citaId" = c.id),
             'Servicio'
           ) AS servicios,
           COALESCE(
             (SELECT SUM(s.costo) FROM detalle_servicio ds JOIN servicios s ON ds."servicioId" = s.id WHERE ds."citaId" = c.id),
             0
           ) AS costo_total
    FROM citas c
    JOIN cliente cli ON c."clienteId" = cli.id
    JOIN usuario u ON cli."usuarioId" = u.id
    JOIN empleado emp ON c."empleadoId" = emp.id
    JOIN usuario emp_u ON emp."usuarioId" = emp_u.id
    WHERE c.id = $1
  `, [data.cita_id]);

  if (rows.length === 0 || !rows[0].email) return;

  const cita = rows[0];

  await transporter.sendMail({
    from: `"ADN Motors" <${process.env.EMAIL_USER}>`,
    to: cita.email,
    subject: '✅ Confirmación de Cita - ADN Motors',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:25px;text-align:center;border-radius:12px 12px 0 0">
          <h2>🔧 ADN Motors</h2>
          <p>Confirmación de Cita Agendada</p>
        </div>
        <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:18px">Hola <strong>${cita.cliente_nombre}</strong>,</p>
          <p>Tu cita ha sido agendada exitosamente.</p>
          <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:20px;margin:20px 0;border-radius:0 8px 8px 0">
            <p><strong>📅 Fecha:</strong> ${formatDateES(cita.fechaCita)}</p>
            <p><strong>🕐 Hora:</strong> ${cita.horaInicio?.slice(0,5)} - ${cita.horaFin?.slice(0,5)}</p>
            <p><strong>👨‍🔧 Mecánico:</strong> ${cita.mecanico_nombre}</p>
            <p><strong>🔧 Servicio:</strong> ${cita.servicios}</p>
            <p><strong>💰 Costo estimado:</strong> $${parseFloat(cita.costo_total).toFixed(2)}</p>
          </div>
          <div style="background:#fef3c7;border:1px solid #f59e0b;padding:15px;border-radius:8px;margin:20px 0">
            <strong>ℹ️ Información importante:</strong>
            <ul><li>Llega 10 minutos antes de tu cita</li><li>Si necesitas cancelar, contáctanos con 24h de anticipación</li></ul>
          </div>
          <div style="text-align:center;color:#9ca3af;font-size:12px;margin-top:30px">
            <p>© 2026 ADN Motors. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    `
  });

  console.log('✅ Email de confirmación enviado a', cita.email);
}

async function sendPreReservaVerification(data) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const link = `${frontendUrl}/reservas/verificar/${data.token}`;

  await transporter.sendMail({
    from: `"ADN Motors" <${process.env.EMAIL_USER}>`,
    to: data.email,
    subject: '🔗 Verifica tu pre-reserva - ADN Motors',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:25px;text-align:center;border-radius:12px 12px 0 0">
          <h2>🔧 ADN Motors</h2>
          <p>Verificación de Pre-Reserva</p>
        </div>
        <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:18px">Hola <strong>${data.nombre}</strong>,</p>
          <p>Has solicitado una pre-reserva en ADN Motors. Para confirmarla, haz clic en el siguiente enlace:</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${link}"
               style="background:#4f46e5;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">
              Verificar mi pre-reserva
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px">Este enlace expira en 24 horas. Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      </div>
    `
  });

  console.log('✅ Email de verificación enviado a', data.email);
}

export async function startEmailWorker() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('LISTEN cita_creada');
    await client.query('LISTEN pre_reserva_creada');
    console.log('👂 Worker de emails escuchando NOTIFY...');

    client.on('notification', async (msg) => {
      try {
        const data = JSON.parse(msg.payload);
        console.log('📩 NOTIFY recibido:', msg.channel, data);

        if (msg.channel === 'cita_creada') {
          await sendAppointmentConfirmation(data);
        } else if (msg.channel === 'pre_reserva_creada') {
          await sendPreReservaVerification(data);
        }
      } catch (err) {
        console.error('Error procesando NOTIFY:', err);
      }
    });
  } catch (err) {
    console.error('Error iniciando worker de emails:', err);
    client.release();
  }
}
