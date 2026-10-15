import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  getStats,
  getRecentServices,
  getCompleto,
  getTendenciaIngresos,
  getTimeline,
  getAlertas,
  getProductividad,
  getOcupacion
} from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/dashboard/stats', verifyToken, requireRole('Administrador', 'Secretaria'), getStats);
router.get('/dashboard/recent-services', verifyToken, requireRole('Administrador', 'Secretaria'), getRecentServices);
router.get('/dashboard/completo', verifyToken, requireRole('Administrador', 'Secretaria'), getCompleto);
router.get('/dashboard/tendencia-ingresos', verifyToken, requireRole('Administrador', 'Secretaria'), getTendenciaIngresos);
router.get('/dashboard/timeline', verifyToken, requireRole('Administrador', 'Secretaria'), getTimeline);
router.get('/dashboard/alertas', verifyToken, requireRole('Administrador', 'Secretaria'), getAlertas);
router.get('/dashboard/productividad', verifyToken, requireRole('Administrador', 'Secretaria'), getProductividad);
router.get('/dashboard/ocupacion', verifyToken, requireRole('Administrador', 'Secretaria'), getOcupacion);

export default router;
