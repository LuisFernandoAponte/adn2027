import createSubscriber from 'pg-listen';
import { config } from '../config/index.js';
import {
  handleCitaCreada,
  handlePresupuestoGenerado,
  handleAlertaStock,
  handlePreReservaCreada,
} from '../services/email.service.js';

const CHANNELS = ['cita_creada', 'presupuesto_generado', 'alerta_stock', 'pre_reserva_creada'];

export const startListener = async () => {
  const connectionString = process.env.DIRECT_URL || config.database.url;

  if (!connectionString) {
    console.warn('⚠️ No hay conexión a base de datos configurada para pg-listen.');
    return null;
  }

  const subscriber = createSubscriber({ connectionString });

  subscriber.notifications.on('cita_creada', (payload) => {
    console.log('📩 Evento recibido: cita_creada');
    handleCitaCreada(payload);
  });

  subscriber.notifications.on('presupuesto_generado', (payload) => {
    console.log('📩 Evento recibido: presupuesto_generado');
    handlePresupuestoGenerado(payload);
  });

  subscriber.notifications.on('alerta_stock', (payload) => {
    console.log('📩 Evento recibido: alerta_stock');
    handleAlertaStock(payload);
  });

  subscriber.notifications.on('pre_reserva_creada', (payload) => {
    console.log('📩 Evento recibido: pre_reserva_creada');
    handlePreReservaCreada(payload);
  });

  subscriber.events.on('error', (err) => {
    console.error('❌ Error en pg-listen:', err.message);
  });

  subscriber.events.on('connection', () => {
    console.log('🔌 Conectado a PostgreSQL LISTEN');
  });

  subscriber.events.on('reconnect', () => {
    console.log('🔄 Reconectando a PostgreSQL...');
  });

  try {
    await subscriber.connect();
    for (const channel of CHANNELS) {
      await subscriber.listenTo(channel);
      console.log(`👂 Escuchando canal: ${channel}`);
    }
    console.log('✅ Microservicio de emails iniciado correctamente');
  } catch (err) {
    console.error('❌ Error iniciando pg-listen:', err);
    // Reintentar después de 5 segundos
    setTimeout(startListener, 5000);
  }

  return subscriber;
};
