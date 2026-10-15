import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { sendSystemEmail } from '../utils/mailer.js';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, 
      },
    });

    // Verificar conexión al iniciar (solo para desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Error de configuración de email:', error.message);
        } else {
          console.log('✅ Servidor de email listo para enviar');
        }
      });
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    if (!userEmail) {
      console.warn('No hay email para enviar bienvenida');
      return { success: false, reason: 'No email provided' };
    }

    const mailOptions = {
      from: `"ADN Motors" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Bienvenido a ADN Motors - Tu taller de confianza',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 16px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
            .greeting { font-size: 20px; color: #dc2626; margin-bottom: 15px; }
            .section { background: #fef2f2; border-left: 4px solid #dc2626; padding: 18px; margin: 18px 0; border-radius: 0 8px 8px 0; }
            .section h3 { margin: 0 0 8px; color: #991b1b; }
            .section p { margin: 5px 0; color: #4b5563; }
            .btn { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .btn:hover { opacity: 0.9; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ADN Motors</h1>
              <p>Taller Mecanico Automotriz</p>
            </div>
            <div class="content">
              <p class="greeting">Hola <strong>${userName}</strong>,</p>
              <p>Gracias por formar parte de <strong>ADN Motors</strong>. Estamos encantados de tenerte con nosotros.</p>
              <p>En ADN Motors nos dedicamos al cuidado de tu vehiculo con los mas altos estandares de calidad y profesionalismo.</p>

              <div class="section">
                <h3>Por que registrarte?</h3>
                <p>Al crear tu cuenta puedes agendar citas facilmente, recibir recordatorios, dar seguimiento a los servicios de tu vehiculo y acceder a promociones exclusivas.</p>
              </div>

              <div class="section">
                <h3>Por que verificar tu email?</h3>
                <p>La verificacion de correo es importante para:</p>
                <p>- Confirmar tu identidad y proteger tu cuenta</p>
                <p>- Recibir notificaciones de tus citas y servicios</p>
                <p>- Garantizar que podamos contactarte cuando lo necesites</p>
              </div>

              <p>Revisa tu bandeja de entrada y verifica tu correo para disfrutar de todos los beneficios. Si aun no lo has hecho, solicita tu codigo de verificacion desde tu perfil.</p>

              <div style="text-align: center; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">Si tienes dudas, respondenos a este correo o contactanos al <strong>+591 78547854</strong></p>
              </div>
            </div>
            <div class="footer">
              <p>ADN Motors — Tu taller de confianza<br>
              Santa Cruz - Bolivia<br>
              &copy; 2026 ADN Motors. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        BIENVENIDO A ADN MOTORS
        =======================
        
        Hola ${userName},
        
        Gracias por formar parte de ADN Motors. Estamos encantados de tenerte con nosotros.
        Somos un taller mecanico automotriz comprometido con la calidad y el profesionalismo.
        
        POR QUE REGISTRARTE?
        Al crear tu cuenta puedes agendar citas facilmente, recibir recordatorios,
        dar seguimiento a los servicios de tu vehiculo y acceder a promociones exclusivas.
        
        POR QUE VERIFICAR TU EMAIL?
        - Confirmar tu identidad y proteger tu cuenta
        - Recibir notificaciones de tus citas y servicios
        - Garantizar que podamos contactarte cuando lo necesites
        
        Si aun no verificaste tu correo, solicita tu codigo desde tu perfil en la plataforma.
        
        Contacto: +591 78547854
        ADN Motors - Santa Cruz, Bolivia
        (c) 2026 ADN Motors
      `
    };

    try {
      const info = await sendSystemEmail(mailOptions);
      if (!info.success) {
        return { success: false, error: info.error };
      }
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error al enviar email de bienvenida:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendAppointmentConfirmation(clientEmail, appointmentData) {
    if (!clientEmail) {
      console.warn('⚠️ No hay email del cliente para enviar confirmación');
      return { success: false, reason: 'No email provided' };
    }

    const {
      clienteNombre,
      empleadoNombre,
      // servicios: array of { descripcion, costo } (new multi-service format)
      // servicioDescripcion: legacy single string (kept for backward compat)
      servicios,
      servicioDescripcion,
      fechaCita,
      horaInicio,
      horaFin,
      observaciones,
      costoTotal
    } = appointmentData;

    // Normalize to array
    const serviciosList = servicios
      ? servicios
      : [{ descripcion: servicioDescripcion || 'Servicio', costo: costoTotal || '0.00' }];

    // Formatear fecha en español
    const fechaFormateada = new Date(fechaCita + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: `"ADN Motors" <${process.env.EMAIL_USER}>`,
      to: clientEmail,
      subject: '✅ Confirmación de Cita - ADN Motors',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 25px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h2 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; opacity: 0.9; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
            .greeting { font-size: 18px; margin-bottom: 20px; }
            .details-box { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #6b7280; }
            .detail-value { color: #111827; font-weight: 500; }
            .highlight { background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .highlight strong { color: #4f46e5; font-size: 18px; }
            .info-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .info-box ul { margin: 10px 0 0; padding-left: 20px; }
            .info-box li { margin: 5px 0; }
            .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; transition: background 0.3s; }
            .btn:hover { background: #4338ca; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
            .footer a { color: #4f46e5; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔧 ADN Motors</h2>
              <p>Confirmación de Cita Agendada</p>
            </div>
            <div class="content">
              <p class="greeting">Hola <strong>${clienteNombre}</strong>,</p>
              <p>¡Tu cita ha sido agendada exitosamente! 🎉 Aquí están los detalles:</p>
              
              <div class="details-box">
                <div class="detail-row">
                  <span class="detail-label">📅 Fecha</span>
                  <span class="detail-value">${fechaFormateada}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕐 Hora</span>
                  <span class="detail-value">${horaInicio} - ${horaFin}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">👨‍🔧 Mecánico</span>
                  <span class="detail-value">${empleadoNombre}</span>
                </div>
                ${serviciosList.length === 1
                  ? `<div class="detail-row">
                      <span class="detail-label">🔧 Servicio</span>
                      <span class="detail-value">${serviciosList[0].descripcion}</span>
                    </div>`
                  : `<div class="detail-row" style="flex-direction:column; gap:6px;">
                      <span class="detail-label">🔧 Servicios (${serviciosList.length})</span>
                      <ul style="margin:4px 0 0; padding-left:18px; color:#111827;">
                        ${serviciosList.map(s => `<li>${s.descripcion} — <strong>$${parseFloat(s.costo||0).toFixed(2)}</strong></li>`).join('')}
                      </ul>
                    </div>`
                }
                <div class="detail-row">
                  <span class="detail-label">💰 Costo estimado</span>
                  <span class="detail-value">$${parseFloat(costoTotal).toFixed(2)}</span>
                </div>
              </div>
              
              ${observaciones ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Observaciones</span>
                  <span class="detail-value">${observaciones}</span>
                </div>
              ` : ''}
              
              <div class="highlight">
                <strong>📍 Visítanos</strong><br>
                Av. Principal #123, Ciudad<br>
                Lunes a Viernes: 9:00 AM - 6:00 PM
              </div>
              
              <div class="info-box">
                <strong>ℹ️ Información importante:</strong>
                <ul>
                  <li>Llega 10 minutos antes de tu cita</li>
                  <li>Si necesitas cancelar o reprogramar, contáctanos con 24h de anticipación</li>
                  <li>Para cambios, responde a este correo o llama al +591 78547854</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="https://tu-sitio.com/cliente/citas" class="btn">Ver mis citas</a>
              </div>
              
              <div class="footer">
                <p>Este es un mensaje automático, por favor no respondas directamente.<br>
                © 2026 ADN Motors. Todos los derechos reservados.<br>
                <a href="https://www.google.com">Visita nuestro sitio web</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        CONFIRMACIÓN DE CITA - ADN Motors
        ==================================
        
        Hola ${clienteNombre},
        
        Tu cita ha sido agendada exitosamente:
        
        📅 Fecha: ${fechaFormateada}
        🕐 Hora: ${horaInicio} - ${horaFin}
        👨‍🔧 Mecánico: ${empleadoNombre}
        🔧 Servicio${serviciosList.length > 1 ? 's' : ''}: ${serviciosList.map(s => s.descripcion).join(', ')}
        💰 Costo estimado: $${parseFloat(costoTotal).toFixed(2)}
        
        ${observaciones ? `📝 Observaciones: ${observaciones}\n\n` : ''}
        
        📍 Dirección: Santa Cruz-Bolivia #7725, 
        🕐 Horario: Lunes a Viernes, 8:00 AM - 6:00 PM
        📞 Contacto: +591 78547854
        
        ℹ️ Información importante:
        - Llega 10 minutos antes de tu cita
        - Si necesitas cancelar o reprogramar, contáctanos con 24h de anticipación
        
        © 2026 ADN Motors
      `
    };

    try {
      const info = await sendSystemEmail(mailOptions);
      if (!info.success) {
        return { success: false, error: info.error };
      }
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();