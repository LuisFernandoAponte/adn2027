import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.middleware.js';
import {
  generarFactura,
  obtenerFactura,
  descargarFacturaPDF
} from '../controllers/factura.controller.js';

const router = Router();

router.post('/generar/:citaId', verifyToken, requirePermiso('Generar facturas'), generarFactura);
router.get('/:id', verifyToken, requirePermiso('Ver facturas'), obtenerFactura);
router.get('/:id/pdf', verifyToken, requirePermiso('Ver facturas'), descargarFacturaPDF);

export default router;