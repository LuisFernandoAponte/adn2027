// Google OAuth y One-Click deshabilitados por política de seguridad y privacidad
import { Router } from 'express';
const router = Router();

router.all('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Autenticación con Google deshabilitada' });
});

export default router;
