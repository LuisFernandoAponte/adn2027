import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  activar
} from '../controllers/usuario.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('Administrador'), getAll);
router.get('/:id', requireRole('Administrador'), getById);
router.post('/', requireRole('Administrador'), create);
router.put('/:id', requireRole('Administrador'), update);
router.delete('/:id', requireRole('Administrador'), remove);
router.patch('/:id/activar', requireRole('Administrador'), activar);

export default router;