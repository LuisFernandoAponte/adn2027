import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  getEgresos,
  getResumenFinanciero,
  crearEgreso,
  actualizarEgreso,
  eliminarEgreso
} from '../controllers/egresos.controller.js';

const router = Router();

// Todas las rutas de egresos requieren autenticación de personal administrativo
router.use(verifyToken);
router.use(requireRole('Administrador', 'Secretaria'));

router.get('/', getEgresos);
router.get('/resumen', getResumenFinanciero);
router.post('/', crearEgreso);
router.put('/:id', actualizarEgreso);
router.delete('/:id', eliminarEgreso);

export default router;
