import { Router } from 'express';
import {
  getVehiculos,
  getHistorialClinico,
  getMantenimientosPreventivos,
} from '../controllers/vehiculo.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('Administrador', 'Secretaria', 'Mecanico'));

router.get('/', getVehiculos);
router.get('/mantenimiento-preventivo', getMantenimientosPreventivos);
router.get('/historial', getHistorialClinico);
router.get('/historial/:placa', getHistorialClinico);

export default router;
