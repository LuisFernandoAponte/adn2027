import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import { exportarReporteExcel } from '../controllers/export.controller.js';

const router = Router();

router.get('/exportar/reporte-excel', verifyToken, requireRole('Administrador', 'Secretaria'), exportarReporteExcel);

export default router;
