import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || config.email.user,
        pass: process.env.EMAIL_APP_PASSWORD || config.email.password,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
};

/**
 * Envia correos usando el proveedor disponible:
 * 1. Brevo REST API (HTTPS Puerto 443 - ideal para Render Free Tier, envia a cualquier correo)
 * 2. Resend REST API (HTTPS Puerto 443 - ideal para Render Free Tier)
 * 3. Nodemailer Gmail SMTP (funciona en localhost o servidores donde los puertos 465/587 no estan bloqueados)
 */
export const sendSystemEmail = async ({ to, subject, html, text }) => {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.EMAIL_USER || config.email.user || 'adn.motors.taller@gmail.com';
  const senderName = 'ADN Motors';

  // 1. Brevo (Sendinblue) HTTP REST API — Puerto 443
  if (brevoKey) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          ...(text ? { textContent: text } : {}),
        }),
      });

      const data = await resp.json();
      if (resp.ok && (data.messageId || data.id)) {
        console.log(`✅ [Brevo] Email enviado exitosamente a ${to}: ${data.messageId || data.id}`);
        return { success: true, provider: 'brevo', messageId: data.messageId || data.id };
      }
      console.warn('⚠️ [Brevo] Respuesta inesperada:', data);
    } catch (err) {
      console.error('❌ [Brevo] Error en llamada API:', err.message);
    }
  }

  // 2. Resend HTTP REST API — Puerto 443
  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || `${senderName} <onboarding@resend.dev>`,
          to: [to],
          subject,
          html,
          ...(text ? { text } : {}),
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.id) {
        console.log(`✅ [Resend] Email enviado exitosamente a ${to}: ${data.id}`);
        return { success: true, provider: 'resend', messageId: data.id };
      }
      console.warn('⚠️ [Resend] Respuesta inesperada:', data);
    } catch (err) {
      console.error('❌ [Resend] Error en llamada API:', err.message);
    }
  }

  // 3. Fallback: Nodemailer SMTP tradicional
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    console.log(`✅ [Nodemailer] Email enviado exitosamente a ${to}: ${info.messageId}`);
    return { success: true, provider: 'nodemailer', messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Nodemailer] Error enviando a ${to}:`, err.message);
    return { success: false, error: err.message, code: err.code };
  }
};
