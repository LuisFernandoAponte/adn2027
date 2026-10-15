import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  crearPreReserva,
  verificarPreReserva,
  verificarTokenPreReserva,
  verificarDisponibilidad
} from '../controllers/reserva.controller.js';

const router = Router();

const preReservaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 pre-reservas por IP cada 15 minutos
  message: { success: false, error: 'Demasiadas solicitudes de cita desde esta conexión. Por favor espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/reservas/pre-reserva', preReservaLimiter, crearPreReserva);
router.get('/reservas/verificar/:token', verificarTokenPreReserva);
router.post('/reservas/verificar/:token', verificarPreReserva);
router.get('/reservas/disponibilidad', verificarDisponibilidad);

export default router;