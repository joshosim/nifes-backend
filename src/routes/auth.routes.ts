import { RequestHandler, Router } from 'express';
import {
  register, login,
  verifyOTP, requestNewOTP,
  resetPassword,
  google0AuthCallback, appleLogin
} from '../controllers/auth.controller';
import passport, { isGoogleOAuthConfigured } from "../config/passport";

const router = Router();
const requireGoogleOAuthConfig: RequestHandler = (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(503).json({
      message: 'Google OAuth is not configured on this server',
    });
  }

  next();
};

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/request-new-otp', requestNewOTP);
router.post('/reset-password', resetPassword);
router.get('/google', requireGoogleOAuthConfig, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  requireGoogleOAuthConfig,
  passport.authenticate('google',
    { session: false, failureRedirect: '/login' }),
  google0AuthCallback);
router.post('/apple', appleLogin);

export default router;
