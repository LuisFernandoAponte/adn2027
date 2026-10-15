import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  asignarPermisos,
  getUsuariosDeRol
} from '../controllers/rol.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/:id/usuarios', getUsuariosDeRol);
router.post('/', requireRole('Administrador'), create);
router.put('/:id', requireRole('Administrador'), update);
router.delete('/:id', requireRole('Administrador'), remove);
router.put('/:id/permisos', requireRole('Administrador'), asignarPermisos);

export default router;