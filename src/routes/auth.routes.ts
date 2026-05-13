import { Router } from 'express';
import {
  register, login,
  verifyOTP, requestNewOTP,
  resetPassword,
  google0AuthCallback, appleLogin
} from '../controllers/auth.controller';
import passport from "../config/passport";

const router = Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/request-new-otp', requestNewOTP);
router.post('/reset-password', resetPassword);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google',
    { session: false, failureRedirect: '/login' }),
  google0AuthCallback);
router.post('/apple', appleLogin);

export default router;