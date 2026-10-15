import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requirePermiso } from '../middlewares/auth.middleware.js';
import {
  listar, obtener, crear, actualizar, eliminar,
} from '../controllers/proveedor.controller.js';

const router = Router();

router.get('/', verifyToken, listar);
router.get('/:id', verifyToken, obtener);
router.post('/', verifyToken, requirePermiso('Gestionar empleados'), crear);
router.put('/:id', verifyToken, requirePermiso('Gestionar empleados'), actualizar);
router.delete('/:id', verifyToken, requirePermiso('Gestionar empleados'), eliminar);

export default router;
