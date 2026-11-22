import { RequestHandler, Router } from 'express';
import {
  register, login,
  verifyOTP, requestNewOTP, requestPasswordReset,
  resetPassword,
  google0AuthCallback, getCurrentUser, appleLogin
} from '../controllers/auth.controller';
import passport, { isGoogleOAuthConfigured } from "../config/passport";
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const requireGoogleOAuthConfig: RequestHandler = (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(503).json({
      message: 'Google OAuth is not configured on this server',
    });
  }

  next();
};

const GOOGLE_OAUTH_STATE_COOKIE = 'unityflow_google_oauth_state';
const requireGoogleOAuthState: RequestHandler = (req, res, next) => {
  if (!(req.get('accept') ?? '').includes('text/html')) {
    return next();
  }

  const state =
    typeof req.query.state === 'string' ? req.query.state : undefined;
  const stateCookie = req.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=`))
    ?.slice(GOOGLE_OAUTH_STATE_COOKIE.length + 1);
  const role = state?.split('.').pop();

  if (
    !state ||
    stateCookie !== state ||
    (role !== 'MENTOR' && role !== 'USER')
  ) {
    return res.status(400).json({
      error: 'Google sign-in could not be verified. Please start again.',
    });
  }

  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
  next();
};

const authenticateGoogleCallback: RequestHandler = (req, res, next) => {
  passport.authenticate('google', { session: false }, (error, user, info) => {
    if (error) {
      return res.status(401).json({ error: 'Google authentication failed' });
    }

    if (!user) {
      const code =
        typeof info === 'object' && info !== null && 'code' in info
          ? info.code
          : undefined;
      if (code === 'GOOGLE_EMAIL_NOT_VERIFIED') {
        return res.status(403).json({ error: 'Google did not provide a verified email address' });
      }
      if (code === 'GOOGLE_ACCOUNT_LINK_CONFLICT') {
        return res.status(409).json({
          error: 'This email matches multiple accounts or is linked to another Google account. Contact NIFES support.',
        });
      }
      return res.status(401).json({ error: 'Google authentication failed' });
    }

    req.user = user;
    next();
  })(req, res, next);
};

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/request-new-otp', requestNewOTP);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware as RequestHandler, getCurrentUser);
router.get('/google', requireGoogleOAuthConfig, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  requireGoogleOAuthConfig,
  requireGoogleOAuthState,
  authenticateGoogleCallback,
  google0AuthCallback);
router.post('/apple', appleLogin);

export default router;
