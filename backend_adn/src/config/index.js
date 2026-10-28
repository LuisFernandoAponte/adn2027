import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  backend: {
    url: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`,
  },

  database: {
    url: process.env.DATABASE_URL
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_APP_PASSWORD
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:8080'
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:8080').split(',').map(o => o.trim()).filter(Boolean)
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
    authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 60000,
  }
};

// Validación de seguridad estricta para entorno productivo
if (config.nodeEnv === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_change_in_production' || process.env.JWT_SECRET.length < 32) {
    console.error('❌ ERROR FATAL DE SEGURIDAD: JWT_SECRET no está configurado o es inseguro en producción.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR FATAL: DATABASE_URL no está definida en las variables de entorno.');
    process.exit(1);
  }
}