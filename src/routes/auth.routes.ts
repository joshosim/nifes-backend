import { Router } from 'express';
import {
  register, login,
  verifyOTP, requestNewOTP
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/request-new-otp', requestNewOTP);

export default router;