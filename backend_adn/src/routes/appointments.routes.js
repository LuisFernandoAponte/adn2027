import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  listarAppointments,
  crearAppointment,
  cambiarEstadoAppointment,
  availableSlots,
} from '../controllers/appointments.controller.js';

const router = Router();

router.get('/appointments', verifyToken, requireRole('Administrador', 'Secretaria', 'Empleado'), listarAppointments);
router.post('/appointments', verifyToken, requireRole('Administrador', 'Secretaria', 'Cliente'), crearAppointment);
router.put('/appointments/:id/status', verifyToken, requireRole('Administrador', 'Secretaria', 'Empleado'), cambiarEstadoAppointment);
router.get('/appointments/available-slots', availableSlots); // público para pre-reserva

export default router;
