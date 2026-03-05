import { Router } from 'express';
import {
  register, login,
  verifyOTP, requestNewOTP,
  resetPassword
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/request-new-otp', requestNewOTP);
router.post('/reset-password', resetPassword);

export default router;