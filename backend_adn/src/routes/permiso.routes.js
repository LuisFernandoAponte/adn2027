import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getMisPermisos
} from '../controllers/permiso.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', getAll);
router.get('/mis-permisos', getMisPermisos);
router.get('/:id', getById);
router.post('/', requireRole('Administrador'), create);
router.put('/:id', requireRole('Administrador'), update);
router.delete('/:id', requireRole('Administrador'), remove);

export default router;