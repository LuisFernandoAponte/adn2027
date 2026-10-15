import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { auditLogin } from '../middlewares/audit.middleware.js';
import {
  login,
  register,
  getProfile,
  sendVerificationEmail,
  verifyEmail,
  refreshToken,
  verifyCode,
  resendVerificationCode,
  updateProfile,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', auditLogin, login);
router.post('/register', register);
router.post('/refresh', refreshToken);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/verify-email', verifyToken, sendVerificationEmail);
router.get('/verify-email', verifyEmail);
router.post('/verify-code', verifyCode);
router.post('/resend-code', resendVerificationCode);

export default router;