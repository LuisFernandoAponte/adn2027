import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
// API ADN Motors Backend Server
dotenv.config();

import { config } from './config/index.js';
import { apiLimiter, authLimiter } from './middlewares/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import clienteRoutes from './routes/cliente.routes.js';
import servicioRoutes from './routes/servicio.routes.js';
import citaRoutes from './routes/cita.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import rolRoutes from './routes/rol.routes.js';
import permisoRoutes from './routes/permiso.routes.js';
import facturaRoutes from './routes/factura.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import estadoTrabajoRoutes from './routes/estadoTrabajo.routes.js';
import reservaRoutes from './routes/reserva.routes.js';
import inventarioRoutes from './routes/inventario.routes.js';
import proveedorRoutes from './routes/proveedor.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import exportRoutes from './routes/export.routes.js';
import pagoRoutes from './routes/pago.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import { startListener } from './listeners/pgListen.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const rawOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  ...(config.cors.origins || [])
];

const allowedOrigins = rawOrigins.map(o => o.trim().replace(/\/$/, '')).filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*') || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  xPoweredBy: false,
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.get(['/health', '/api/health'], async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      service: 'adn-motors-backend',
      database: 'connected',
      email_configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      service: 'adn-motors-backend',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/test-email', async (req, res) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return res.status(500).json({
      success: false,
      error: 'Variables EMAIL_USER o EMAIL_APP_PASSWORD no están configuradas en Render.',
      user_configured: Boolean(user),
      pass_configured: Boolean(pass)
    });
  }

  try {
    const testTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 10000,
    });
    await testTransporter.verify();
    return res.json({
      success: true,
      message: 'Gmail SMTP conectado exitosamente y listo para enviar correos.',
      user: user.replace(/(.{3})(.*)(@.*)/, '$1***$3')
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code || 'SMTP_ERROR'
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API ADN Motors funcionando',
    entorno: config.nodeEnv,
    version: '2.0.0',
    documentacion: '/api/docs',
    rutas: [
      '/api/auth',
      '/api/cliente',
      '/api/servicio',
      '/api/citas',
      '/api/usuarios',
      '/api/roles',
      '/api/permisos',
      '/api/facturas',
      '/api/dashboard',
      '/api/pagos',
      '/api/exportar/reporte-excel',
    ]
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/servicio', servicioRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api', citaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/permisos', permisoRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', estadoTrabajoRoutes);
app.use('/api', reservaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api', reportesRoutes);
app.use('/api', exportRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api', appointmentsRoutes);

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON inválido en la solicitud' });
  }
  if (err.message === 'CORS no permitido') {
    return res.status(403).json({ success: false, error: 'CORS no permitido desde este origen' });
  }
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

import prisma from './config/database.js';

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

const PORT = config.port;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚗 ADN Motors API v2.0.0`);
  console.log(`   Servidor: http://0.0.0.0:${PORT}`);
  console.log(`   Entorno: ${config.nodeEnv}`);
  console.log(`   Base de datos: PostgreSQL`);

  // Iniciar microservicio de notificaciones por email
  if (config.nodeEnv !== 'test') {
    startListener().catch(err => console.error('Error iniciando listener:', err));
  }
});

// Manejo de apagado elegante (Graceful Shutdown) para Render / Docker
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor limpiamente...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('✅ Conexión con PostgreSQL cerrada.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error desconectando de la base de datos:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;