import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.middleware.js';
import { listarPagos, crearPago, obtenerPago, anularPago } from '../controllers/pago.controller.js';

const router = Router();

router.get('/', verifyToken, requirePermiso('Ver facturas'), listarPagos);
router.post('/', verifyToken, requirePermiso('Generar facturas'), crearPago);
router.get('/:id', verifyToken, requirePermiso('Ver facturas'), obtenerPago);
router.patch('/:id/anular', verifyToken, requirePermiso('Generar facturas'), anularPago);

export default router;
