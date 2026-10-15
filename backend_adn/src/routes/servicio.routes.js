import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { getAll } from '../controllers/servicio.controller.js';

const router = Router();

router.get('/', getAll);
router.get('/servicios', getAll);

export default router;