import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  listar, obtener, crear, actualizar, ajustarStock, eliminar, movimientos,
  addStock, deductStock, stockAlerts, listarInventario, obtenerResumenInventario
} from '../controllers/inventario.controller.js';

const router = Router();

router.get('/', verifyToken, requireRole('Administrador', 'Empleado', 'Secretaria'), listar);
router.get('/resumen', verifyToken, requireRole('Administrador', 'Empleado', 'Secretaria'), obtenerResumenInventario);
router.get('/alerts', verifyToken, requireRole('Administrador', 'Secretaria'), stockAlerts);
router.get('/search', verifyToken, requireRole('Administrador', 'Empleado', 'Secretaria'), listarInventario);
router.get('/:id', verifyToken, requireRole('Administrador', 'Empleado', 'Secretaria'), obtener);
router.post('/', verifyToken, requireRole('Administrador'), crear);
router.put('/:id', verifyToken, requireRole('Administrador'), actualizar);
router.patch('/:id/stock', verifyToken, requireRole('Administrador'), ajustarStock);
router.post('/:id/add-stock', verifyToken, requireRole('Administrador'), addStock);
router.post('/:id/deduct-stock', verifyToken, requireRole('Administrador', 'Empleado'), deductStock);
router.delete('/:id', verifyToken, requireRole('Administrador'), eliminar);
router.get('/:id/movimientos', verifyToken, requireRole('Administrador', 'Empleado', 'Secretaria'), movimientos);

export default router;
