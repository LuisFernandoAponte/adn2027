import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  dashboardCompleto, ingresosPeriodo, serviciosMasUsados,
  rendimientoEmpleados, citasPorEstado, inventarioValorizado, clientesFrecuentes,
  alertasTaller, ocupacionTaller, tendenciaIngresos, timelineActividad, productividadTaller,
  obtenerDatosReporteCompleto,
} from '../controllers/reportes.controller.js';

const router = Router();

router.get('/dashboard/completo', verifyToken, requireRole('Administrador', 'Secretaria'), dashboardCompleto);
router.get('/dashboard/alertas', verifyToken, requireRole('Administrador', 'Secretaria'), alertasTaller);
router.get('/dashboard/ocupacion', verifyToken, requireRole('Administrador', 'Secretaria'), ocupacionTaller);
router.get('/dashboard/tendencia-ingresos', verifyToken, requireRole('Administrador', 'Secretaria'), tendenciaIngresos);
router.get('/dashboard/timeline', verifyToken, requireRole('Administrador', 'Secretaria'), timelineActividad);
router.get('/dashboard/productividad', verifyToken, requireRole('Administrador', 'Secretaria'), productividadTaller);
router.get('/reportes/ingresos', verifyToken, requireRole('Administrador', 'Secretaria'), ingresosPeriodo);
router.get('/reportes/servicios', verifyToken, requireRole('Administrador', 'Secretaria'), serviciosMasUsados);
router.get('/reportes/empleados', verifyToken, requireRole('Administrador', 'Secretaria'), rendimientoEmpleados);
router.get('/reportes/citas-estado', verifyToken, requireRole('Administrador', 'Secretaria'), citasPorEstado);
router.get('/reportes/inventario', verifyToken, requireRole('Administrador', 'Secretaria'), inventarioValorizado);
router.get('/reportes/clientes', verifyToken, requireRole('Administrador', 'Secretaria'), clientesFrecuentes);
router.get('/reportes/completo-excel', verifyToken, requireRole('Administrador', 'Secretaria'), obtenerDatosReporteCompleto);

export default router;
