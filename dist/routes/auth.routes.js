"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const passport_1 = __importStar(require("../config/passport"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const requireGoogleOAuthConfig = (req, res, next) => {
    if (!passport_1.isGoogleOAuthConfigured) {
        return res.status(503).json({
            message: 'Google OAuth is not configured on this server',
        });
    }
    next();
};
const GOOGLE_OAUTH_STATE_COOKIE = 'unityflow_google_oauth_state';
const requireGoogleOAuthState = (req, res, next) => {
    if (!(req.get('accept') ?? '').includes('text/html')) {
        return next();
    }
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const stateCookie = req.headers.cookie
        ?.split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=`))
        ?.slice(GOOGLE_OAUTH_STATE_COOKIE.length + 1);
    const role = state?.split('.').pop();
    if (!state ||
        stateCookie !== state ||
        (role !== 'MENTOR' && role !== 'USER')) {
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
const authenticateGoogleCallback = (req, res, next) => {
    passport_1.default.authenticate('google', { session: false }, (error, user, info) => {
        if (error) {
            return res.status(401).json({ error: 'Google authentication failed' });
        }
        if (!user) {
            const code = typeof info === 'object' && info !== null && 'code' in info
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
router.post('/register', auth_controller_1.register);
router.post('/verify-otp', auth_controller_1.verifyOTP);
router.post('/login', auth_controller_1.login);
router.post('/request-new-otp', auth_controller_1.requestNewOTP);
router.post('/request-password-reset', auth_controller_1.requestPasswordReset);
router.post('/reset-password', auth_controller_1.resetPassword);
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.getCurrentUser);
router.get('/google', requireGoogleOAuthConfig, passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', requireGoogleOAuthConfig, requireGoogleOAuthState, authenticateGoogleCallback, auth_controller_1.google0AuthCallback);
router.post('/apple', auth_controller_1.appleLogin);
exports.default = router;
