import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { actualizarEstado, verHistorial } from '../controllers/estadoTrabajo.controller.js';

const router = Router();

router.patch('/trabajos/:citaId/estado', verifyToken, actualizarEstado);
router.get('/trabajos/:citaId/historial', verifyToken, verHistorial);

export default router;